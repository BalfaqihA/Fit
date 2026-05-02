import { useMemo } from 'react';

import { useUserProfile } from '@/hooks/use-user-profile';
import { useMeasurements } from '@/hooks/use-measurements';
import { bmiFromKg } from '@/lib/measurements';
import { dateToIso } from '@/lib/plan-day';
import type { GoalKey } from '@/types/community';

export type BodyStatKey = 'weight' | 'bmi';

export type BodyStatRow = {
  key: BodyStatKey;
  label: string;
  unit: string;
  value: string;
  /** numeric latest value, for charts/comparisons */
  latest: number;
  /** chronological history points */
  history: { date: string; value: number }[];
  goal?: string;
  description: string;
  /** signed difference vs first measurement; positive = up. */
  netChange: number;
  /** "improvement-aware": true means user is moving toward their goal. */
  improving: boolean;
  changeLabel: string;
};

function goalDescriptor(
  primaryGoal: GoalKey | undefined,
  startWeight: number
): { label: string; targetDelta: number; preferDirection: 'down' | 'up' | 'flat' } {
  switch (primaryGoal) {
    case 'lose_weight':
      return {
        label: `${(startWeight - 5).toFixed(1)} kg`,
        targetDelta: -5,
        preferDirection: 'down',
      };
    case 'build_muscle':
      return {
        label: `${(startWeight + 4).toFixed(1)} kg`,
        targetDelta: 4,
        preferDirection: 'up',
      };
    case 'stay_fit':
    case 'increase_endurance':
    case 'improve_flexibility':
    default:
      return {
        label: `${startWeight.toFixed(1)} kg`,
        targetDelta: 0,
        preferDirection: 'flat',
      };
  }
}

export function useBodyStats(): {
  stats: BodyStatRow[];
  loading: boolean;
  hasMeasurements: boolean;
} {
  const { profile } = useUserProfile();
  const { measurements, latestWeight, loading } = useMeasurements();

  return useMemo(() => {
    const heightCm = profile.heightCm ?? 0;
    const onboardingWeight = profile.weightKg ?? 0;
    const first = measurements[0];
    const startWeight = first?.weightKg ?? onboardingWeight;
    const latest = latestWeight || onboardingWeight;

    const weightHistory = measurements.length
      ? measurements.map((m) => ({
          date: dateToIso(m.recordedAt),
          value: round1(m.weightKg),
        }))
      : onboardingWeight
        ? [{ date: dateToIso(new Date()), value: round1(onboardingWeight) }]
        : [];

    const goal = goalDescriptor(profile.primaryGoal, startWeight);
    const weightDelta = startWeight ? latest - startWeight : 0;
    const weightImproving =
      goal.preferDirection === 'flat'
        ? Math.abs(weightDelta) < 1
        : goal.preferDirection === 'down'
          ? weightDelta <= 0
          : weightDelta >= 0;

    const weightRow: BodyStatRow = {
      key: 'weight',
      label: 'Weight',
      unit: 'kg',
      value: latest ? latest.toFixed(1) : '--',
      latest: latest || 0,
      history: weightHistory,
      goal: goal.label,
      description:
        'Your latest logged weight. Update weekly so your progress and BMI stay accurate.',
      netChange: round1(weightDelta),
      improving: weightImproving,
      changeLabel:
        weightDelta === 0
          ? '0.0 kg since start'
          : `${weightDelta > 0 ? '+' : ''}${round1(weightDelta)} kg since start`,
    };

    const latestBmi = bmiFromKg(latest, heightCm);
    const startBmi = bmiFromKg(startWeight, heightCm);
    const bmiHistory = weightHistory.map((p) => ({
      date: p.date,
      value: heightCm ? round1(bmiFromKg(p.value, heightCm)) : 0,
    }));
    const bmiDelta = latestBmi - startBmi;
    const bmiImproving = goal.preferDirection === 'down'
      ? bmiDelta <= 0
      : goal.preferDirection === 'up'
        ? bmiDelta >= 0
        : Math.abs(bmiDelta) < 0.5;

    const bmiRow: BodyStatRow = {
      key: 'bmi',
      label: 'BMI',
      unit: '',
      value: latestBmi ? latestBmi.toFixed(1) : '--',
      latest: latestBmi || 0,
      history: bmiHistory,
      description:
        'Body Mass Index — derived from your latest weight and onboarding height.',
      netChange: round1(bmiDelta),
      improving: bmiImproving,
      changeLabel:
        bmiDelta === 0
          ? '0.0 since start'
          : `${bmiDelta > 0 ? '+' : ''}${round1(bmiDelta)} since start`,
    };

    return {
      stats: [weightRow, bmiRow],
      loading,
      hasMeasurements: measurements.length > 0,
    };
  }, [profile.heightCm, profile.weightKg, profile.primaryGoal, measurements, latestWeight, loading]);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
