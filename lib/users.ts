import {
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { captureException } from '@/lib/observability';
import type { SeedUser } from '@/types/community';

export type SearchUser = SeedUser;

const USERS = 'users';

function rowFromDoc(id: string, d: Record<string, unknown>): SearchUser {
  return {
    id,
    displayName: (d.displayName as string) ?? '',
    handle: (d.handle as string) ?? '',
    bio: (d.bio as string) ?? '',
    avatarUri: (d.avatarUri as string) ?? '',
    coverUri: (d.coverUri as string) ?? undefined,
    goals: (d.goals as SeedUser['goals']) ?? [],
  };
}

/**
 * Prefix search over the `users` collection. Firestore has no full-text
 * search, so we use range queries on the lowercased mirror fields
 * `handleLower` and `displayNameLower` that `UserProfileProvider.updateProfile`
 * writes on every save. Results from both queries are merged + deduped by id.
 *
 * Limitations: matches are prefix-only — "fa" finds "faisal" but not "alfa".
 */
export async function searchUsers(
  prefix: string,
  max = 20,
): Promise<SearchUser[]> {
  const p = prefix.trim().toLowerCase();
  if (!p) return [];
  // Firestore /users read requires isSignedIn(); skip the round-trip if we
  // know up front that the call will be denied.
  if (!auth.currentUser) return [];
  const end = p + '';

  try {
    const handleQ = query(
      collection(db, USERS),
      where('handleLower', '>=', p),
      where('handleLower', '<=', end),
      orderBy('handleLower'),
      fbLimit(max),
    );
    const nameQ = query(
      collection(db, USERS),
      where('displayNameLower', '>=', p),
      where('displayNameLower', '<=', end),
      orderBy('displayNameLower'),
      fbLimit(max),
    );
    const [hSnap, nSnap] = await Promise.all([getDocs(handleQ), getDocs(nameQ)]);
    const merged = new Map<string, SearchUser>();
    for (const docSnap of [...hSnap.docs, ...nSnap.docs]) {
      if (merged.has(docSnap.id)) continue;
      merged.set(docSnap.id, rowFromDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
    }
    return Array.from(merged.values()).slice(0, max);
  } catch (e) {
    captureException(e, { tags: { area: 'users', op: 'searchUsers' } });
    return [];
  }
}
