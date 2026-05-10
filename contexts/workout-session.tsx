import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { CALORIES_PER_MINUTE } from '@/constants/workout-data';
import {
  cancelResumeReminder,
  notifyResumeWorkout,
} from '@/lib/notifications';
import { dateToIso } from '@/lib/plan-day';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import type { CompletedExerciseLog } from '@/lib/workouts';
import type { PlanDay, PlanExercise } from '@/types/plan';

export type SessionState = {
  isActive: boolean;
  planId?: string;
  dayNum?: number;
  planExercises: PlanExercise[];
  currentIndex: number;
  completedCount: number;
  accumulatedXp: number;
  startedAt: number;
  startedAtIso: string;
  pausedAt: number | null;
  pausedDurationMs: number;
  completedExercises: CompletedExerciseLog[];
};

type WorkoutSessionContextValue = {
  session: SessionState;
  startSession: (day: PlanDay, planId?: string) => void;
  completeCurrent: (xpDelta: number, actualSets: number) => void;
  reset: () => void;
  pause: () => void;
  resume: () => void;
  elapsedSec: number;
  minutes: number;
  calories: number;
  totalCount: number;
  currentExercise?: PlanExercise;
  nextExercise?: PlanExercise;
  planExercises: PlanExercise[];
  completedExercises: CompletedExerciseLog[];
  isPaused: boolean;
  restoredSession: SessionState | null;
  restoredHydrated: boolean;
  restoreSession: () => void;
  discardRestoredSession: () => void;
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
  startedAtIso: '',
  pausedAt: null,
  pausedDurationMs: 0,
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

function computeElapsedSec(s: SessionState, now: number): number {
  if (!s.startedAt) return 0;
  const end = s.pausedAt ?? now;
  return Math.max(0, Math.floor((end - s.startedAt - s.pausedDurationMs) / 1000));
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
  const [restoredSession, setRestoredSession] = useState<SessionState | null>(
    null
  );
  const [restoredHydrated, setRestoredHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hydrate any persisted in-progress session on first mount. We surface the
  // restored payload via `restoredSession` rather than auto-restoring, so the
  // home screen can prompt the user before we resume them.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadJSON<SessionState | null>(
        STORAGE_KEYS.workoutSession,
        null
      );
      if (cancelled) return;
      if (saved && saved.isActive) {
        setRestoredSession(saved);
      }
      setRestoredHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist active sessions on every change. Clearing on reset/discard is
  // handled explicitly by those callbacks — leaving the empty-session state
  // out of this effect avoids wiping a saved entry between hydration and the
  // user choosing to resume it.
  useEffect(() => {
    if (!restoredHydrated) return;
    if (session.isActive) {
      saveJSON(STORAGE_KEYS.workoutSession, session);
    }
  }, [session, restoredHydrated]);

  // Live timer tick: only runs while the session is active and not paused.
  useEffect(() => {
    if (!session.isActive || session.pausedAt) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      // Make sure the displayed value matches the canonical formula (e.g. just
      // resumed — show the running value immediately, or just paused — freeze).
      setElapsedSec(computeElapsedSec(session, Date.now()));
      return;
    }
    setElapsedSec(computeElapsedSec(session, Date.now()));
    intervalRef.current = setInterval(() => {
      setElapsedSec(computeElapsedSec(session, Date.now()));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session]);

  const startSession = useCallback((day: PlanDay, planId?: string) => {
    const now = Date.now();
    setSession({
      isActive: true,
      planId,
      dayNum: day.day,
      planExercises: day.exercises,
      currentIndex: 0,
      completedCount: 0,
      accumulatedXp: 0,
      startedAt: now,
      startedAtIso: dateToIso(new Date(now)),
      pausedAt: null,
      pausedDurationMs: 0,
      completedExercises: [],
    });
    setElapsedSec(0);
    setRestoredSession(null);
    cancelResumeReminder();
  }, []);

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
    saveJSON(STORAGE_KEYS.workoutSession, null);
    cancelResumeReminder();
  }, []);

  const pause = useCallback(() => {
    setSession((prev) => {
      if (!prev.isActive || prev.pausedAt) return prev;
      return { ...prev, pausedAt: Date.now() };
    });
  }, []);

  const resume = useCallback(() => {
    setSession((prev) => {
      if (!prev.isActive || !prev.pausedAt) return prev;
      const addedPause = Date.now() - prev.pausedAt;
      return {
        ...prev,
        pausedAt: null,
        pausedDurationMs: prev.pausedDurationMs + Math.max(0, addedPause),
      };
    });
    cancelResumeReminder();
  }, []);

  // Auto-pause on background and surface a notification so the user remembers
  // to come back. Dismiss the notification when they return to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' && session.isActive && !session.pausedAt) {
        pause();
        notifyResumeWorkout(session.dayNum);
      }
      if (next === 'active') {
        cancelResumeReminder();
      }
    });
    return () => sub.remove();
  }, [session.isActive, session.pausedAt, session.dayNum, pause]);

  const restoreSession = useCallback(() => {
    if (!restoredSession) return;
    setSession(restoredSession);
    setElapsedSec(computeElapsedSec(restoredSession, Date.now()));
    setRestoredSession(null);
    cancelResumeReminder();
  }, [restoredSession]);

  const discardRestoredSession = useCallback(() => {
    setRestoredSession(null);
    saveJSON(STORAGE_KEYS.workoutSession, null);
    cancelResumeReminder();
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
      pause,
      resume,
      elapsedSec,
      minutes,
      calories,
      totalCount: planExercises.length,
      currentExercise,
      nextExercise,
      planExercises,
      completedExercises: session.completedExercises,
      isPaused: !!session.pausedAt,
      restoredSession,
      restoredHydrated,
      restoreSession,
      discardRestoredSession,
    }),
    [
      session,
      startSession,
      completeCurrent,
      reset,
      pause,
      resume,
      elapsedSec,
      minutes,
      calories,
      currentExercise,
      nextExercise,
      planExercises,
      restoredSession,
      restoredHydrated,
      restoreSession,
      discardRestoredSession,
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
