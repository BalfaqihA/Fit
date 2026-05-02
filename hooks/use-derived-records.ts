import { useMemo } from 'react';

import {
  useWorkoutHistory,
  type WorkoutSessionDoc,
} from '@/hooks/use-workout-history';
import { dateToIso } from '@/lib/plan-day';

export type DerivedRecord = {
  id: 'longest_session' | 'best_calorie_day' | 'best_xp_day' | 'longest_streak';
  label: string;
  value: string;
  unit: string;
  icon: string;
  delta: string;
  trend: 'up' | 'down';
  achievedAt: string;
  description: string;
  /** Sparkline points: chronological list of attempts/days for this metric. */
  history: { date: string; value: number }[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(d: Date): string {
  return dateToIso(d);
}

function aggregatePerDay(
  sessions: WorkoutSessionDoc[],
  pick: (s: WorkoutSessionDoc) => number
): { date: string; value: number }[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dateToIso(s.completedAt);
    map.set(key, (map.get(key) ?? 0) + pick(s));
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, value]) => ({ date, value }));
}

function streakRunHistory(sessions: WorkoutSessionDoc[]): {
  date: string;
  value: number;
}[] {
  if (sessions.length === 0) return [];
  const days = Array.from(
    new Set(
      sessions.map((s) => {
        const d = new Date(s.completedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
    )
  ).sort((a, b) => a - b);

  // Cumulative best-streak-so-far at each day.
  let run = 1;
  let best = 1;
  const out: { date: string; value: number }[] = [
    { date: formatDate(new Date(days[0])), value: 1 },
  ];
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === MS_PER_DAY) run += 1;
    else run = 1;
    if (run > best) best = run;
    out.push({ date: formatDate(new Date(days[i])), value: best });
  }
  return out;
}

export function useDerivedRecords(): DerivedRecord[] {
  const { sessions } = useWorkoutHistory();

  return useMemo(() => {
    if (sessions.length === 0) return [];

    // Longest single session (by duration).
    let longest = sessions[0];
    for (const s of sessions) {
      if (s.durationMin > longest.durationMin) longest = s;
    }

    // Best calorie day, best XP day (by daily total).
    const dailyCalories = aggregatePerDay(sessions, (s) => s.caloriesKcal);
    const dailyXp = aggregatePerDay(sessions, (s) => s.xp);
    const peakCal = dailyCalories.reduce(
      (best, p) => (p.value > best.value ? p : best),
      dailyCalories[0]
    );
    const peakXp = dailyXp.reduce(
      (best, p) => (p.value > best.value ? p : best),
      dailyXp[0]
    );

    const streakHistory = streakRunHistory(sessions);
    const longestStreak = streakHistory.length
      ? streakHistory[streakHistory.length - 1].value
      : 0;
    const longestStreakDate = streakHistory.length
      ? streakHistory[streakHistory.length - 1].date
      : formatDate(new Date());

    // History sparkline for "longest session": every session's duration in chronological order.
    const sessionDurationHistory = sessions
      .slice()
      .sort((a, b) => +a.completedAt - +b.completedAt)
      .map((s) => ({
        date: formatDate(s.completedAt),
        value: s.durationMin,
      }));

    return [
      {
        id: 'longest_session',
        label: 'Longest Session',
        value: `${longest.durationMin}`,
        unit: 'min',
        icon: 'timer-outline',
        delta: `+${longest.exercisesCompleted} ex`,
        trend: 'up',
        achievedAt: formatDate(longest.completedAt),
        description: 'Your longest single workout — pure stamina.',
        history: sessionDurationHistory,
      },
      {
        id: 'best_calorie_day',
        label: 'Best Calorie Day',
        value: `${peakCal.value}`,
        unit: 'kcal',
        icon: 'fire',
        delta: `+${peakCal.value} kcal`,
        trend: 'up',
        achievedAt: peakCal.date,
        description: 'Most calories burned in a single day.',
        history: dailyCalories,
      },
      {
        id: 'best_xp_day',
        label: 'Best XP Day',
        value: `${peakXp.value}`,
        unit: 'xp',
        icon: 'trophy-outline',
        delta: `+${peakXp.value} XP`,
        trend: 'up',
        achievedAt: peakXp.date,
        description: 'Highest XP earned in a single day.',
        history: dailyXp,
      },
      {
        id: 'longest_streak',
        label: 'Longest Streak',
        value: `${longestStreak}`,
        unit: 'days',
        icon: 'flame',
        delta: `${longestStreak}d`,
        trend: 'up',
        achievedAt: longestStreakDate,
        description: 'Most consecutive days you trained.',
        history: streakHistory,
      },
    ];
  }, [sessions]);
}

export function getDerivedRecord(
  records: DerivedRecord[],
  id: string
): DerivedRecord | undefined {
  return records.find((r) => r.id === id);
}
