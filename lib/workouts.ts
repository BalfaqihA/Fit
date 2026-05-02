import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { todayIso } from '@/lib/plan-day';
import type { PlanExercise } from '@/types/plan';

export const exerciseXp = (e: Pick<PlanExercise, 'sets' | 'reps'>) =>
  Math.max(50, Math.round(e.sets * e.reps * 1.2));

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
  /** When provided (the user has no `planStartDate` yet), stamps the user doc with this ISO date. */
  setPlanStartDate?: boolean;
};

export async function recordCompletedWorkout(
  uid: string,
  payload: CompletedWorkoutPayload,
) {
  const userRef = doc(db, 'users', uid);
  const workoutRef = doc(collection(db, 'users', uid, 'workouts'));
  const batch = writeBatch(db);
  const { setPlanStartDate, ...session } = payload;
  batch.set(workoutRef, { ...session, completedAt: serverTimestamp() });
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
