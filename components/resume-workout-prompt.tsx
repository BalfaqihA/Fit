import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { CALORIES_PER_MINUTE } from '@/constants/workout-data';
import { type SessionState, useWorkoutSession } from '@/contexts/workout-session';
import { useAuth } from '@/hooks/use-auth';
import { captureException } from '@/lib/observability';
import { todayIso } from '@/lib/plan-day';
import { randomId } from '@/lib/uuid';
import { recordCompletedWorkout } from '@/lib/workouts';

function partialDurationMin(s: SessionState): number {
  if (!s.startedAt) return 1;
  const end = s.pausedAt ?? Date.now();
  const ms = end - s.startedAt - s.pausedDurationMs;
  return Math.max(1, Math.floor(ms / 60000));
}

export function ResumeWorkoutPrompt() {
  const {
    restoredSession,
    restoredHydrated,
    restoreSession,
    discardRestoredSession,
  } = useWorkoutSession();
  const { user } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (!restoredHydrated || !restoredSession || handled.current) return;
    handled.current = true;

    const isStale = restoredSession.startedAtIso !== todayIso();
    const completed = restoredSession.completedCount;
    const total = restoredSession.planExercises.length;
    const dayLabel =
      restoredSession.dayNum != null ? `Day ${restoredSession.dayNum}` : 'Workout';

    if (!isStale) {
      Alert.alert(
        'Resume your workout?',
        `${dayLabel}: ${completed}/${total} exercises done.`,
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => discardRestoredSession(),
          },
          {
            text: 'Resume',
            onPress: () => {
              const idx = restoredSession.currentIndex;
              restoreSession();
              router.push(`/workout/run/${idx}` as never);
            },
          },
        ],
        { cancelable: false }
      );
      return;
    }

    Alert.alert(
      'Unfinished workout from a previous day',
      `${dayLabel}: ${completed}/${total} exercises done. Continue where you left off, or move on to today's session?`,
      [
        {
          text: 'Continue previous',
          onPress: () => {
            const idx = restoredSession.currentIndex;
            restoreSession();
            router.push(`/workout/run/${idx}` as never);
          },
        },
        {
          text: "Move to today's workout",
          onPress: async () => {
            try {
              if (user && restoredSession.completedCount > 0) {
                const durationMin = partialDurationMin(restoredSession);
                const caloriesKcal = Math.round(durationMin * CALORIES_PER_MINUTE);
                await recordCompletedWorkout(user.uid, {
                  idempotencyKey: randomId(),
                  planId: restoredSession.planId,
                  dayNum: restoredSession.dayNum,
                  durationMin,
                  caloriesKcal,
                  exercisesCompleted: restoredSession.completedCount,
                  xp: restoredSession.accumulatedXp,
                  exercises:
                    restoredSession.completedExercises.length > 0
                      ? restoredSession.completedExercises
                      : undefined,
                  source: 'partial',
                  notes: 'Partial — abandoned for next day',
                });
              }
            } catch (e) {
              captureException(e, {
                tags: { area: 'workout', op: 'savePartial' },
              });
            } finally {
              discardRestoredSession();
              router.push('/workout/start' as never);
            }
          },
        },
      ],
      { cancelable: false }
    );
  }, [
    restoredHydrated,
    restoredSession,
    restoreSession,
    discardRestoredSession,
    user,
  ]);

  return null;
}
