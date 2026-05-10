import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';
import type { SeedUser, UserProfile } from '@/types/community';

import { useCommunity } from './use-community';

type ResolvedUser = SeedUser | UserProfile;

/**
 * Resolves a user id to a profile, preferring the in-memory community context
 * (current user + SEED_USERS) and falling back to a Firestore read at
 * `users/{id}` for arbitrary uids. Returns `undefined` while loading the
 * Firestore fallback so callers can render a "loading" state distinctly from
 * "not found" — `notFound` flips to `true` only after the Firestore lookup
 * resolves to a missing doc.
 */
export function useUserById(id: string | undefined): {
  user: ResolvedUser | undefined;
  loading: boolean;
  notFound: boolean;
} {
  const { getUserById } = useCommunity();
  const seed = id ? getUserById(id) : undefined;
  const [remote, setRemote] = useState<ResolvedUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || seed) {
      setRemote(null);
      setLoading(false);
      setNotFound(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getDoc(doc(db, 'users', id))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setNotFound(true);
          setRemote(null);
          return;
        }
        const data = snap.data() as Partial<UserProfile>;
        setRemote({
          id,
          displayName: data.displayName ?? '',
          handle: data.handle ?? '',
          email: data.email ?? '',
          bio: data.bio ?? '',
          avatarUri: data.avatarUri,
          coverUri: data.coverUri,
          goals: data.goals ?? [],
          goalsVisible: data.goalsVisible ?? true,
          weightUnit: data.weightUnit ?? 'kg',
          distanceUnit: data.distanceUnit ?? 'km',
        });
      })
      .catch(() => {
        // Network errors leave the user undefined; UI shows "not found"
        // rather than crashing. Sentry already captures via global handler.
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, seed]);

  return {
    user: seed ?? remote ?? undefined,
    loading,
    notFound: notFound && !seed && !remote,
  };
}
