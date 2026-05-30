import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useUserProfile } from '@/hooks/use-user-profile';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/types/community';

/**
 * Resolves a user id to a profile. The signed-in user is served instantly
 * from the live profile context; any other id is read from Firestore at
 * `users/{id}`. `notFound` flips to `true` only after the lookup resolves to
 * a missing doc (so callers can show "loading" vs "not found" distinctly).
 */
export function useUserById(id: string | undefined): {
  user: UserProfile | undefined;
  loading: boolean;
  notFound: boolean;
} {
  const { profile } = useUserProfile();
  const isSelf = !!id && id === profile.id;
  const [remote, setRemote] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || isSelf) {
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
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isSelf]);

  return {
    user: isSelf ? profile : remote ?? undefined,
    loading,
    notFound: notFound && !isSelf,
  };
}
