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

// Firestore prefix-range sentinel: a very high code point so the range
// [p, p + HIGH] covers exactly the strings that start with `p`.
const HIGH_CODEPOINT = String.fromCharCode(0xf8ff);

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

function tokenize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

/**
 * Search fields written on every profile save (and by the backfill script).
 *
 * - `displayNameLower` / `handleLower`: lowercased mirrors for prefix range
 *   queries.
 * - `searchTokens`: every 1..12-char prefix of every word in the name and
 *   handle. This is the classic Firestore "match any word prefix" trick — it
 *   makes search smart: typing part of a last name (or any word) finds the
 *   user, not just names that start with the query.
 */
export function buildUserSearchFields(
  displayName: string,
  handle: string
): { displayNameLower: string; handleLower: string; searchTokens: string[] } {
  const displayNameLower = (displayName || '').trim().toLowerCase();
  const handleLower = (handle || '').trim().toLowerCase();
  const words = Array.from(
    new Set([...tokenize(displayName), ...tokenize(handle)])
  ).slice(0, 12);
  const tokens = new Set<string>();
  for (const w of words) {
    const max = Math.min(w.length, 12);
    for (let i = 1; i <= max; i++) tokens.add(w.slice(0, i));
  }
  return {
    displayNameLower,
    handleLower,
    searchTokens: Array.from(tokens).slice(0, 150),
  };
}

/**
 * Smart user search over the `users` collection. Firestore has no full-text
 * search, so we combine three queries and merge them:
 *
 *  1. prefix range on `handleLower`
 *  2. prefix range on `displayNameLower`
 *  3. `array-contains` on `searchTokens` (matches ANY word prefix, so "faqeih"
 *     finds "Ahmed Balfaqeih" even though the name doesn't start with it)
 *
 * Falls back gracefully if `searchTokens` is missing on older docs (the
 * prefix queries still work after the backfill).
 */
export async function searchUsers(
  input: string,
  max = 20
): Promise<SearchUser[]> {
  const p = input.trim().toLowerCase();
  if (!p) return [];
  // Firestore /users read requires isSignedIn(); skip the round-trip if we
  // know up front that the call will be denied.
  if (!auth.currentUser) return [];
  // [p, p + HIGH_CODEPOINT] is the range of all strings that start with `p`.
  // (The previous `p + ''` matched the exact string only, so search was broken.)
  const end = p + HIGH_CODEPOINT;
  const token = tokenize(p)[0] ?? p;

  try {
    const handleQ = query(
      collection(db, USERS),
      where('handleLower', '>=', p),
      where('handleLower', '<=', end),
      orderBy('handleLower'),
      fbLimit(max)
    );
    const nameQ = query(
      collection(db, USERS),
      where('displayNameLower', '>=', p),
      where('displayNameLower', '<=', end),
      orderBy('displayNameLower'),
      fbLimit(max)
    );
    const tokenQ = query(
      collection(db, USERS),
      where('searchTokens', 'array-contains', token),
      fbLimit(max)
    );

    const [hSnap, nSnap, tSnap] = await Promise.all([
      getDocs(handleQ),
      getDocs(nameQ),
      getDocs(tokenQ).catch(() => ({ docs: [] as never[] })),
    ]);

    const merged = new Map<string, SearchUser>();
    for (const docSnap of [...hSnap.docs, ...nSnap.docs, ...tSnap.docs]) {
      if (merged.has(docSnap.id)) continue;
      merged.set(
        docSnap.id,
        rowFromDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
    }
    // Drop the signed-in user from their own search results.
    merged.delete(auth.currentUser.uid);
    return Array.from(merged.values()).slice(0, max);
  } catch (e) {
    captureException(e, { tags: { area: 'users', op: 'searchUsers' } });
    return [];
  }
}
