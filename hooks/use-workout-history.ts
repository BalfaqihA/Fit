import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';

export type WorkoutSessionDoc = {
  id: string;
  completedAt: Date;
  durationMin: number;
  caloriesKcal: number;
  exercisesCompleted: number;
  xp: number;
  planId?: string;
  dayNum?: number;
};

export function useWorkoutHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSessionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'users', user.uid, 'workouts'),
      orderBy('completedAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: WorkoutSessionDoc[] = snap.docs.map((d) => {
          const raw = d.data() as {
            completedAt?: Timestamp;
            durationMin?: number;
            caloriesKcal?: number;
            exercisesCompleted?: number;
            xp?: number;
            planId?: string;
            dayNum?: number;
          };
          return {
            id: d.id,
            completedAt: raw.completedAt ? raw.completedAt.toDate() : new Date(),
            durationMin: raw.durationMin ?? 0,
            caloriesKcal: raw.caloriesKcal ?? 0,
            exercisesCompleted: raw.exercisesCompleted ?? 0,
            xp: raw.xp ?? 0,
            planId: raw.planId,
            dayNum: raw.dayNum,
          };
        });
        setSessions(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  return { sessions, loading };
}
