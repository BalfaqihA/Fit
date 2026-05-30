import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';

// Mirrors the Python build_weight_update_insight() payload written to
// users/{uid}/insights/latestWeightUpdate by the on_measurement_write trigger.

export type WeightBlock = {
  currentKg: number | null;
  previousKg: number | null;
  deltaSinceLastKg: number;
  delta30dKg: number;
  delta30dPercent: number;
  direction: 'up' | 'down' | 'flat';
  goalAlignment: 'good' | 'neutral' | 'needs_attention';
  message: string;
};

export type TopDay = {
  dateIso: string;
  minutes: number;
  caloriesKcal: number;
  workouts: number;
};

export type CurrentWeek = {
  weekStartIso: string;
  weekEndIso: string;
  workouts: number;
  activeDays: number;
  minutes: number;
  caloriesKcal: number;
  xp: number;
  plannedWorkouts?: number;
  adherencePercent?: number;
  topDay: TopDay | null;
};

export type MostActiveWeek = CurrentWeek & { reason: string };

export type TopExerciseStat = {
  exerciseId?: string | null;
  name: string;
  primaryMuscle?: string | null;
  category?: string | null;
  equipment?: string | null;
  timesCompleted: number;
  totalSets: number;
  totalReps: number;
  totalDurationMin: number;
  totalCaloriesKcal: number;
  totalXp: number;
  avgRpe?: number | null;
  bestWeightKg?: number | null;
  lastPerformedAt?: string | null;
  contributionPercent: number;
  calorieSource: 'tracked' | 'estimated';
};

export type TopMuscleStat = {
  muscle: string;
  sessions: number;
  exercises: number;
  totalCaloriesKcal: number;
  totalSets: number;
  totalReps: number;
};

export type LatestWeightUpdateInsight = {
  userId: string | null;
  measurementId: string | null;
  schemaVersion: number;
  weight: WeightBlock;
  currentWeek: CurrentWeek;
  mostActiveWeek: MostActiveWeek | null;
  topExercises: TopExerciseStat[];
  topMuscles: TopMuscleStat[];
  suggestions: string[];
};

export function useWeightUpdateInsights() {
  const { user } = useAuth();
  const [insight, setInsight] = useState<LatestWeightUpdateInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInsight(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, 'users', user.uid, 'insights', 'latestWeightUpdate');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setInsight(
          snap.exists() ? (snap.data() as LatestWeightUpdateInsight) : null
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  return useMemo(() => ({ insight, loading }), [insight, loading]);
}
