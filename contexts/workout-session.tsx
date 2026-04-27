import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  CALORIES_PER_MINUTE,
  EXERCISES,
  type Exercise,
} from '@/constants/workout-data';

type SessionState = {
  isActive: boolean;
  dayNum?: number;
  exerciseIds: string[];
  currentIndex: number;
  completedIds: string[];
  accumulatedXp: number;
  startedAt: number;
};

type WorkoutSessionContextValue = {
  session: SessionState;
  startSession: (exerciseIds: string[], dayNum?: number) => void;
  completeCurrent: (xpDelta: number) => void;
  reset: () => void;
  elapsedSec: number;
  minutes: number;
  calories: number;
  totalCount: number;
  currentExercise?: Exercise;
  nextExercise?: Exercise;
  exercises: Exercise[];
};

const emptySession: SessionState = {
  isActive: false,
  dayNum: undefined,
  exerciseIds: [],
  currentIndex: 0,
  completedIds: [],
  accumulatedXp: 0,
  startedAt: 0,
};

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
    (exerciseIds: string[], dayNum?: number) => {
      setSession({
        isActive: true,
        dayNum,
        exerciseIds,
        currentIndex: 0,
        completedIds: [],
        accumulatedXp: 0,
        startedAt: Date.now(),
      });
      setElapsedSec(0);
    },
    []
  );

  const completeCurrent = useCallback((xpDelta: number) => {
    setSession((prev) => {
      if (!prev.isActive) return prev;
      const currentId = prev.exerciseIds[prev.currentIndex];
      const alreadyDone = currentId && prev.completedIds.includes(currentId);
      return {
        ...prev,
        completedIds:
          currentId && !alreadyDone
            ? [...prev.completedIds, currentId]
            : prev.completedIds,
        accumulatedXp: prev.accumulatedXp + xpDelta,
        currentIndex: prev.currentIndex + 1,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setSession(emptySession);
    setElapsedSec(0);
  }, []);

  const exercises = useMemo<Exercise[]>(() => {
    return session.exerciseIds
      .map((id) => EXERCISES.find((e) => e.id === id))
      .filter((e): e is Exercise => Boolean(e));
  }, [session.exerciseIds]);

  const currentExercise = exercises[session.currentIndex];
  const nextExercise = exercises[session.currentIndex];

  const minutes = Math.floor(elapsedSec / 60);
  const calories = Math.round(minutes * CALORIES_PER_MINUTE);

  const value = useMemo<WorkoutSessionContextValue>(
    () => ({
      session,
      startSession,
      completeCurrent,
      reset,
      elapsedSec,
      minutes,
      calories,
      totalCount: session.exerciseIds.length,
      currentExercise,
      nextExercise,
      exercises,
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
      exercises,
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
