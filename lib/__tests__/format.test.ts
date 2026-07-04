import { relativeTime, timeRemaining } from '../format';

const NOW = 1_700_000_000_000; // fixed reference point
const SEC = 1000;
const MIN = 60 * SEC;
const HR = 60 * MIN;
const DAY = 24 * HR;

describe('relativeTime', () => {
  it('clamps future timestamps to "just now"', () => {
    expect(relativeTime(NOW + 10_000, NOW)).toBe('just now');
  });

  it('returns "just now" under 45 seconds', () => {
    expect(relativeTime(NOW - 44 * SEC, NOW)).toBe('just now');
  });

  it('returns minutes between 45s and 1h', () => {
    expect(relativeTime(NOW - 5 * MIN, NOW)).toBe('5m ago');
    expect(relativeTime(NOW - 59 * MIN, NOW)).toBe('59m ago');
  });

  it('returns hours between 1h and 24h', () => {
    expect(relativeTime(NOW - 1 * HR, NOW)).toBe('1h ago');
    expect(relativeTime(NOW - 23 * HR, NOW)).toBe('23h ago');
  });

  it('returns days between 1d and 7d', () => {
    expect(relativeTime(NOW - 1 * DAY, NOW)).toBe('1d ago');
    expect(relativeTime(NOW - 6 * DAY, NOW)).toBe('6d ago');
  });

  it('returns weeks between 1w and 5w', () => {
    expect(relativeTime(NOW - 7 * DAY, NOW)).toBe('1w ago');
    expect(relativeTime(NOW - 28 * DAY, NOW)).toBe('4w ago');
  });

  it('returns months after ~5 weeks', () => {
    expect(relativeTime(NOW - 60 * DAY, NOW)).toBe('2mo ago');
  });

  it('returns years past 12 months', () => {
    expect(relativeTime(NOW - 400 * DAY, NOW)).toBe('1y ago');
  });

  it('uses Date.now() when no reference is supplied', () => {
    expect(relativeTime(Date.now())).toBe('just now');
  });
});

describe('timeRemaining', () => {
  it('clamps past expiry to a minimum of 1m left', () => {
    expect(timeRemaining(NOW - 5 * MIN, NOW)).toBe('1m left');
  });

  it('reports hours when >= 1 hour remains', () => {
    expect(timeRemaining(NOW + 3 * HR, NOW)).toBe('3h left');
  });

  it('reports minutes when under an hour remains', () => {
    expect(timeRemaining(NOW + 30 * MIN, NOW)).toBe('30m left');
  });

  it('never reports 0m (floors at 1m)', () => {
    expect(timeRemaining(NOW + 10 * SEC, NOW)).toBe('1m left');
  });
});
