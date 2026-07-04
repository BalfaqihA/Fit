import {
  COMPLETION_BONUS_XP,
  LEVEL_XP,
  XP_PER_MINUTE,
  levelFromXp,
  xpForExercise,
  xpForWorkout,
} from '../gamification';

describe('xpForExercise', () => {
  it('scales with sets * reps * 1.2 and rounds', () => {
    // 4 * 12 * 1.2 = 57.6 -> 58
    expect(xpForExercise(4, 12)).toBe(58);
  });

  it('enforces a floor of 50 XP', () => {
    expect(xpForExercise(1, 1)).toBe(50);
    expect(xpForExercise(0, 0)).toBe(50);
  });
});

describe('xpForWorkout', () => {
  it('sums exercise XP, duration XP and the completion bonus', () => {
    const xp = xpForWorkout({ exerciseXpSum: 200, durationMin: 30 });
    expect(xp).toBe(200 + 30 * XP_PER_MINUTE + COMPLETION_BONUS_XP);
  });

  it('ignores negative durations', () => {
    const xp = xpForWorkout({ exerciseXpSum: 100, durationMin: -10 });
    expect(xp).toBe(100 + COMPLETION_BONUS_XP);
  });
});

describe('levelFromXp', () => {
  it('starts everyone at level 1 with zero XP', () => {
    expect(levelFromXp(0)).toEqual({
      level: 1,
      currentLevelXp: 0,
      nextLevelXp: LEVEL_XP,
      progress: 0,
      remainingXp: LEVEL_XP,
    });
  });

  it('advances a level every LEVEL_XP points', () => {
    const info = levelFromXp(LEVEL_XP);
    expect(info.level).toBe(2);
    expect(info.currentLevelXp).toBe(0);
    expect(info.remainingXp).toBe(LEVEL_XP);
  });

  it('reports partial progress within a level', () => {
    const info = levelFromXp(1500);
    expect(info.level).toBe(2);
    expect(info.currentLevelXp).toBe(500);
    expect(info.progress).toBeCloseTo(0.5, 5);
    expect(info.remainingXp).toBe(500);
  });

  it('clamps negative XP to zero', () => {
    expect(levelFromXp(-100).level).toBe(1);
    expect(levelFromXp(-100).currentLevelXp).toBe(0);
  });

  it('floors fractional XP', () => {
    expect(levelFromXp(999.9).currentLevelXp).toBe(999);
  });
});
