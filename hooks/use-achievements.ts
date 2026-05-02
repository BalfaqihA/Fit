import {
  collection,
  onSnapshot,
  query,
  type Timestamp,
  orderBy,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';

export type UnlockedAchievementDoc = {
  id: string;
  unlockedAt: Date | null;
  xpReward: number;
};

export function useAchievements(uid?: string) {
  const { user } = useAuth();
  const targetUid = uid ?? user?.uid;
  const [docs, setDocs] = useState<UnlockedAchievementDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetUid) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'users', targetUid, 'achievements'),
      orderBy('unlockedAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDocs(
          snap.docs.map((d) => {
            const raw = d.data() as {
              unlockedAt?: Timestamp;
              xpReward?: number;
            };
            return {
              id: d.id,
              unlockedAt: raw.unlockedAt ? raw.unlockedAt.toDate() : null,
              xpReward: raw.xpReward ?? 0,
            };
          }),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [targetUid]);

  return { unlocked: docs, loading };
}
