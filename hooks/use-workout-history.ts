import { useContext, useMemo } from 'react';

import {
  WorkoutHistoryContext,
  type WorkoutSessionDoc,
} from '@/contexts/workout-history';
import { dateToIso, todayIso } from '@/lib/plan-day';

export type { WorkoutSessionDoc };

export function useWorkoutHistory() {
  return useContext(WorkoutHistoryContext);
}

export function useTodayWorkout(): WorkoutSessionDoc | null {
  const { sessions } = useWorkoutHistory();
  return useMemo(() => {
    const today = todayIso();
    return (
      sessions.find((s) => dateToIso(s.completedAt) === today) ?? null
    );
  }, [sessions]);
}
