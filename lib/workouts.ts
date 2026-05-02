import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { xpForExercise } from '@/lib/gamification';
import { todayIso } from '@/lib/plan-day';
import type { PlanExercise } from '@/types/plan';

export const exerciseXp = (e: Pick<PlanExercise, 'sets' | 'reps'>) =>
  xpForExercise(e.sets, e.reps);

export type WorkoutSource = 'workout' | 'manual_log';

export type CompletedExerciseLog = {
  name: string;
  primaryMuscle?: string;
  imageId?: string;
  plannedSets: number;
  plannedReps: number;
  actualSets: number;
};

export type CompletedWorkoutPayload = {
  planId?: string;
  dayNum?: number;
  durationMin: number;
  caloriesKcal: number;
  exercisesCompleted: number;
  xp: number;
  exercises?: CompletedExerciseLog[];
  /** Origin of the entry — auto-tracked session vs. manual log entry. */
  source?: WorkoutSource;
  /** When provided (the user has no `planStartDate` yet), stamps the user doc with this ISO date. */
  setPlanStartDate?: boolean;
};

// IMPORTANT: callers must guard against double-invocation per logical workout
// — `stats.totalXp` and `stats.totalWorkouts` use Firestore `increment()`,
// which adds the delta on each batch commit. Two calls = double-counted XP.
// `app/workout/summary.tsx` and `app/workout/log.tsx` both use a ref/flag
// guard to ensure a single call per session.
export async function recordCompletedWorkout(
  uid: string,
  payload: CompletedWorkoutPayload,
) {
  const userRef = doc(db, 'users', uid);
  const workoutRef = doc(collection(db, 'users', uid, 'workouts'));
  const xpEventRef = doc(collection(db, 'users', uid, 'xp_events'));
  const batch = writeBatch(db);
  const { setPlanStartDate, source = 'workout', ...session } = payload;

  batch.set(workoutRef, {
    ...session,
    source,
    completedAt: serverTimestamp(),
  });

  batch.set(xpEventRef, {
    workoutId: workoutRef.id,
    source,
    xp: payload.xp,
    createdAt: serverTimestamp(),
  });

  const userPatch: Record<string, unknown> = {
    stats: {
      totalWorkouts: increment(1),
      totalMinutes: increment(payload.durationMin),
      totalCaloriesKcal: increment(payload.caloriesKcal),
      totalXp: increment(payload.xp),
    },
    lastWorkoutAt: todayIso(),
  };
  if (setPlanStartDate) userPatch.planStartDate = todayIso();
  batch.set(userRef, userPatch, { merge: true });

  await batch.commit();
  return workoutRef.id;
}
