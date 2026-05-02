import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CALORIES_PER_MINUTE } from '@/constants/workout-data';
import type { CompletedExerciseLog } from '@/lib/workouts';
import type { PlanDay, PlanExercise } from '@/types/plan';

type SessionState = {
  isActive: boolean;
  planId?: string;
  dayNum?: number;
  planExercises: PlanExercise[];
  currentIndex: number;
  completedCount: number;
  accumulatedXp: number;
  startedAt: number;
  completedExercises: CompletedExerciseLog[];
};

type WorkoutSessionContextValue = {
  session: SessionState;
  startSession: (day: PlanDay, planId?: string) => void;
  completeCurrent: (xpDelta: number, actualSets: number) => void;
  reset: () => void;
  elapsedSec: number;
  minutes: number;
  calories: number;
  totalCount: number;
  currentExercise?: PlanExercise;
  nextExercise?: PlanExercise;
  planExercises: PlanExercise[];
  completedExercises: CompletedExerciseLog[];
};

const emptySession: SessionState = {
  isActive: false,
  planId: undefined,
  dayNum: undefined,
  planExercises: [],
  currentIndex: 0,
  completedCount: 0,
  accumulatedXp: 0,
  startedAt: 0,
  completedExercises: [],
};

function buildLog(
  exercise: PlanExercise,
  actualSets: number
): CompletedExerciseLog {
  return {
    name: exercise.name,
    primaryMuscle: exercise.primaryMuscles[0],
    imageId: exercise.images?.[0],
    plannedSets: exercise.sets,
    plannedReps: exercise.reps,
    actualSets: Math.max(0, Math.min(actualSets, exercise.sets)),
  };
}

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(
  null
);

export function WorkoutSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<SessionState>(emptySession);
  const [elapsedSec, setElapsedSec] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!session.isActive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - session.startedAt) / 1000));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session.isActive, session.startedAt]);

  const startSession = useCallback(
    (day: PlanDay, planId?: string) => {
      setSession({
        isActive: true,
        planId,
        dayNum: day.day,
        planExercises: day.exercises,
        currentIndex: 0,
        completedCount: 0,
        accumulatedXp: 0,
        startedAt: Date.now(),
        completedExercises: [],
      });
      setElapsedSec(0);
    },
    []
  );

  const completeCurrent = useCallback(
    (xpDelta: number, actualSets: number) => {
      setSession((prev) => {
        if (!prev.isActive) return prev;
        const exercise = prev.planExercises[prev.currentIndex];
        const log = exercise ? buildLog(exercise, actualSets) : null;
        return {
          ...prev,
          completedCount: prev.completedCount + 1,
          accumulatedXp: prev.accumulatedXp + xpDelta,
          currentIndex: prev.currentIndex + 1,
          completedExercises: log
            ? [...prev.completedExercises, log]
            : prev.completedExercises,
        };
      });
    },
    []
  );

  const reset = useCallback(() => {
    setSession(emptySession);
    setElapsedSec(0);
  }, []);

  const planExercises = session.planExercises;
  const currentExercise = planExercises[session.currentIndex];
  const nextExercise = planExercises[session.currentIndex + 1];

  const minutes = Math.floor(elapsedSec / 60);
  const calories = Math.round((elapsedSec / 60) * CALORIES_PER_MINUTE);

  const value = useMemo<WorkoutSessionContextValue>(
    () => ({
      session,
      startSession,
      completeCurrent,
      reset,
      elapsedSec,
      minutes,
      calories,
      totalCount: planExercises.length,
      currentExercise,
      nextExercise,
      planExercises,
      completedExercises: session.completedExercises,
    }),
    [
      session,
      startSession,
      completeCurrent,
      reset,
      elapsedSec,
      minutes,
      calories,
      currentExercise,
      nextExercise,
      planExercises,
    ]
  );

  return (
    <WorkoutSessionContext.Provider value={value}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) {
    throw new Error(
      'useWorkoutSession must be used inside <WorkoutSessionProvider>'
    );
  }
  return ctx;
}
