import {
  collection,
  doc,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { PlanExercise } from '@/types/plan';

export const exerciseXp = (e: Pick<PlanExercise, 'sets' | 'reps'>) =>
  Math.max(50, Math.round(e.sets * e.reps * 1.2));

export type CompletedWorkoutPayload = {
  planId?: string;
  dayNum?: number;
  durationMin: number;
  caloriesKcal: number;
  exercisesCompleted: number;
  xp: number;
};

export async function recordCompletedWorkout(
  uid: string,
  payload: CompletedWorkoutPayload,
) {
  const userRef = doc(db, 'users', uid);
  const workoutRef = doc(collection(db, 'users', uid, 'workouts'));
  const batch = writeBatch(db);
  batch.set(workoutRef, { ...payload, completedAt: serverTimestamp() });
  batch.set(
    userRef,
    {
      stats: {
        totalWorkouts: increment(1),
        totalMinutes: increment(payload.durationMin),
        totalCaloriesKcal: increment(payload.caloriesKcal),
      },
    },
    { merge: true },
  );
  await batch.commit();
  return workoutRef.id;
}
