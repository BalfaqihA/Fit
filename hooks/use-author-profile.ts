import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { db } from '@/lib/firebase';

/**
 * Live display name + avatar for a community author, read straight from
 * `users/{uid}`. Posts, comments, and stories store a *denormalized* snapshot
 * of the author's name/avatar at creation time, so they go stale when someone
 * edits their profile. Components use this hook to prefer the current values
 * and fall back to the stored snapshot.
 *
 * Subscriptions are shared and ref-counted in a module-level cache so many
 * rows for the same author share a single Firestore listener.
 */
export type AuthorProfile = {
  displayName?: string;
  avatarUrl?: string | null;
};

type Entry = {
  value: AuthorProfile;
  subscribers: Set<(v: AuthorProfile) => void>;
  unsub?: () => void;
};

const cache = new Map<string, Entry>();

function ensure(uid: string): Entry {
  let entry = cache.get(uid);
  if (entry) return entry;
  entry = { value: {}, subscribers: new Set() };
  cache.set(uid, entry);
  const current = entry;
  current.unsub = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      const d = snap.data() as Record<string, unknown> | undefined;
      const value: AuthorProfile = d
        ? {
            displayName: (d.displayName as string) ?? undefined,
            avatarUrl: (d.avatarUri as string | null) ?? null,
          }
        : {};
      current.value = value;
      current.subscribers.forEach((cb) => cb(value));
    },
    () => {
      // Ignore read errors (e.g. permission-denied during sign-out).
    }
  );
  return current;
}

export function useAuthorProfile(
  uid: string | null | undefined
): AuthorProfile {
  const [value, setValue] = useState<AuthorProfile>(() =>
    uid ? cache.get(uid)?.value ?? {} : {}
  );

  useEffect(() => {
    if (!uid) {
      setValue({});
      return;
    }
    const entry = ensure(uid);
    setValue(entry.value);
    const cb = (v: AuthorProfile) => setValue(v);
    entry.subscribers.add(cb);
    return () => {
      entry.subscribers.delete(cb);
      if (entry.subscribers.size === 0) {
        entry.unsub?.();
        cache.delete(uid);
      }
    };
  }, [uid]);

  return value;
}
