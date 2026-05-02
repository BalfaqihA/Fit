const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayIso(): string {
  return dateToIso(new Date());
}

function startOfLocalDay(d: Date): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

export function isoToLocalDayStart(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return startOfLocalDay(new Date(y, (m ?? 1) - 1, d ?? 1));
}

export function daysSinceIso(iso: string, now: Date = new Date()): number {
  const start = isoToLocalDayStart(iso);
  const today = startOfLocalDay(now);
  return Math.max(0, Math.round((today - start) / MS_PER_DAY));
}

/**
 * Day-by-calendar progression. Returns the running day number (1, 2, 3 …)
 * starting from Day 1 on `planStartDate` and incrementing once per
 * calendar day after that. When `planStartDate` is unset (the user has
 * not completed their first workout yet), returns 1 — i.e. today is
 * "Day 1" until they finish their first session.
 */
export function computeDayNumber(planStartDate: string | undefined): number {
  if (!planStartDate) return 1;
  return daysSinceIso(planStartDate) + 1;
}

/**
 * Returns the index into a plan.days array for the running day number,
 * cycling through the plan with modulo when the user has been training
 * longer than the plan covers.
 */
export function planDayIndex(dayNumber: number, daysCount: number): number {
  if (daysCount <= 0) return 0;
  return (dayNumber - 1) % daysCount;
}

/**
 * Computes the current consecutive-day streak. Days must be `Date`
 * instances representing workout completion timestamps.
 */
export function computeStreak(dates: Date[], now: Date = new Date()): number {
  if (dates.length === 0) return 0;
  const days = new Set<number>(dates.map((d) => startOfLocalDay(d)));
  const today = startOfLocalDay(now);
  // The streak only counts if the user trained today or yesterday.
  let cursor = days.has(today) ? today : days.has(today - MS_PER_DAY) ? today - MS_PER_DAY : 0;
  if (!cursor) return 0;
  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor -= MS_PER_DAY;
  }
  return n;
}
