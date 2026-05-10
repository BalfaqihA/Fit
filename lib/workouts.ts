import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { xpForExercise } from '@/lib/gamification';
import { todayIso } from '@/lib/plan-day';
import type { PlanExercise } from '@/types/plan';

export const exerciseXp = (e: Pick<PlanExercise, 'sets' | 'reps'>) =>
  xpForExercise(e.sets, e.reps);

export type WorkoutSource = 'workout' | 'manual_log' | 'partial';

export type CompletedExerciseLog = {
  name: string;
  primaryMuscle?: string;
  imageId?: string;
  plannedSets: number;
  plannedReps: number;
  actualSets: number;
  weightKg?: number;
  rpe?: number;
};

export type CompletedWorkoutPayload = {
  /**
   * Stable id used as the workout doc id and the matching xp_event id.
   * The transaction below aborts if a workout with this id already exists,
   * making `recordCompletedWorkout` safe to retry without double-granting XP.
   * Callers should generate one id per logical workout (not per attempt).
   */
  idempotencyKey: string;
  planId?: string;
  dayNum?: number;
  durationMin: number;
  caloriesKcal: number;
  exercisesCompleted: number;
  xp: number;
  exercises?: CompletedExerciseLog[];
  notes?: string;
  /** Origin of the entry — auto-tracked session vs. manual log entry. */
  source?: WorkoutSource;
  /** When provided (the user has no `planStartDate` yet), stamps the user doc with this ISO date. */
  setPlanStartDate?: boolean;
};

export type RecordWorkoutResult = {
  workoutId: string;
  /** True when an existing workout doc with the same idempotencyKey was found, so no new XP/stats were granted. */
  alreadyRecorded: boolean;
};

export async function recordCompletedWorkout(
  uid: string,
  payload: CompletedWorkoutPayload,
): Promise<RecordWorkoutResult> {
  const { idempotencyKey, setPlanStartDate, source = 'workout', ...session } = payload;
  if (!idempotencyKey) {
    throw new Error('recordCompletedWorkout: idempotencyKey is required.');
  }
  const userRef = doc(db, 'users', uid);
  const workoutRef = doc(collection(db, 'users', uid, 'workouts'), idempotencyKey);
  const xpEventRef = doc(collection(db, 'users', uid, 'xp_events'), idempotencyKey);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(workoutRef);
    if (existing.exists()) {
      return { workoutId: workoutRef.id, alreadyRecorded: true };
    }

    tx.set(workoutRef, {
      ...session,
      source,
      completedAt: serverTimestamp(),
    });

    tx.set(xpEventRef, {
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
    tx.set(userRef, userPatch, { merge: true });

    return { workoutId: workoutRef.id, alreadyRecorded: false };
  });
}
