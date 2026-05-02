import { useMemo } from 'react';

import { useWorkoutHistory } from '@/hooks/use-workout-history';
import { computeStreak, dateToIso } from '@/lib/plan-day';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEK_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export type WeeklyBar = {
  day: string;
  dateIso: string;
  minutes: number;
  calories: number;
  workouts: number;
  /** 0..1 for chart height, normalized against the highest bar in this 7-day window. */
  value: number;
};

export type WeeklyStats = {
  bars: WeeklyBar[];
  totals: {
    minutes: number;
    calories: number;
    workouts: number;
  };
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
};

/**
 * Returns last 7 calendar days (Mon → Sun ending today) of workout activity,
 * plus current and longest streak across the user's full session history.
 */
export function useWeeklyStats(): WeeklyStats {
  const { sessions, loading } = useWorkoutHistory();

  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build map: ISO date → { minutes, calories, workouts }
    const byDay = new Map<
      string,
      { minutes: number; calories: number; workouts: number }
    >();
    for (const s of sessions) {
      const iso = dateToIso(s.completedAt);
      const acc = byDay.get(iso) ?? { minutes: 0, calories: 0, workouts: 0 };
      acc.minutes += s.durationMin;
      acc.calories += s.caloriesKcal;
      acc.workouts += 1;
      byDay.set(iso, acc);
    }

    // Build last 7 days, oldest first (so the chart reads left → right toward today).
    const bars: WeeklyBar[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * MS_PER_DAY);
      const iso = dateToIso(d);
      const slot = byDay.get(iso) ?? { minutes: 0, calories: 0, workouts: 0 };
      bars.push({
        day: WEEK_LETTERS[d.getDay()],
        dateIso: iso,
        minutes: slot.minutes,
        calories: slot.calories,
        workouts: slot.workouts,
        value: 0,
      });
    }
    const peakMinutes = bars.reduce((m, b) => Math.max(m, b.minutes), 0);
    if (peakMinutes > 0) {
      for (const b of bars) b.value = b.minutes / peakMinutes;
    }

    const totals = bars.reduce(
      (acc, b) => ({
        minutes: acc.minutes + b.minutes,
        calories: acc.calories + b.calories,
        workouts: acc.workouts + b.workouts,
      }),
      { minutes: 0, calories: 0, workouts: 0 }
    );
    const activeDays = bars.filter((b) => b.minutes > 0).length;

    const allDates = sessions.map((s) => s.completedAt);
    const currentStreak = computeStreak(allDates);
    const longestStreak = computeLongestStreak(allDates);

    return { bars, totals, activeDays, currentStreak, longestStreak, loading };
  }, [sessions, loading]);
}

function computeLongestStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = Array.from(
    new Set(
      dates.map((d) => {
        const c = new Date(d);
        c.setHours(0, 0, 0, 0);
        return c.getTime();
      })
    )
  ).sort((a, b) => a - b);

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === MS_PER_DAY) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
