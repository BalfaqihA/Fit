import {
  computeDayNumber,
  computeStreak,
  dateToIso,
  daysSinceIso,
  isoToLocalDayStart,
  planDayIndex,
  todayIso,
} from '../plan-day';

const DAY = 24 * 60 * 60 * 1000;

describe('dateToIso', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(dateToIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateToIso(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('todayIso', () => {
  it('matches dateToIso for the current local day', () => {
    expect(todayIso()).toBe(dateToIso(new Date()));
  });
});

describe('isoToLocalDayStart', () => {
  it('returns local midnight for the given iso day', () => {
    const ms = isoToLocalDayStart('2026-06-15');
    const d = new Date(ms);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('tolerates a bare year string by defaulting month/day', () => {
    const d = new Date(isoToLocalDayStart('2026'));
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

describe('daysSinceIso', () => {
  it('returns 0 for today', () => {
    const now = new Date(2026, 5, 20, 14, 30);
    expect(daysSinceIso(dateToIso(now), now)).toBe(0);
  });

  it('counts whole calendar days elapsed', () => {
    const now = new Date(2026, 5, 20);
    expect(daysSinceIso('2026-06-15', now)).toBe(5);
  });

  it('never goes negative for future dates', () => {
    const now = new Date(2026, 5, 1);
    expect(daysSinceIso('2026-06-10', now)).toBe(0);
  });
});

describe('computeDayNumber', () => {
  it('returns 1 when no start date is set', () => {
    expect(computeDayNumber(undefined)).toBe(1);
  });

  it('returns days-since + 1', () => {
    const iso = dateToIso(new Date(Date.now() - 3 * DAY));
    expect(computeDayNumber(iso)).toBe(4);
  });
});

describe('planDayIndex', () => {
  it('returns 0 when the plan has no days', () => {
    expect(planDayIndex(5, 0)).toBe(0);
  });

  it('maps day numbers to a zero-based index', () => {
    expect(planDayIndex(1, 3)).toBe(0);
    expect(planDayIndex(3, 3)).toBe(2);
  });

  it('cycles through the plan with modulo', () => {
    expect(planDayIndex(4, 3)).toBe(0);
    expect(planDayIndex(7, 3)).toBe(0);
  });
});

describe('computeStreak', () => {
  const at = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY);

  it('returns 0 with no workout dates', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreak([at(0), at(1), at(2)])).toBe(3);
  });

  it('counts a streak ending yesterday', () => {
    expect(computeStreak([at(1), at(2)])).toBe(2);
  });

  it('breaks the streak when there is a gap', () => {
    expect(computeStreak([at(0), at(2), at(3)])).toBe(1);
  });

  it('returns 0 when the most recent workout is older than yesterday', () => {
    expect(computeStreak([at(3), at(4)])).toBe(0);
  });

  it('de-duplicates multiple workouts on the same day', () => {
    expect(computeStreak([at(0), at(0), at(1)])).toBe(2);
  });
});
