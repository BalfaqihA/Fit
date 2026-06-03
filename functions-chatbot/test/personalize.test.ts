// getFirestore/Timestamp are only touched inside buildPersonalContext (not the
// pure helper under test), but mock the module so importing personalize.ts
// never tries to reach Firestore.
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}));

import { applyWeightUpdateToContext } from '../src/personalize';
import type { PersonalContext } from '../src/personalize';

describe('applyWeightUpdateToContext', () => {
  it('derives weekly velocity, goal alignment, muscle balance, and top exercise', () => {
    const ctx = {} as PersonalContext;
    applyWeightUpdateToContext(ctx, {
      weight: { delta30dKg: -3.2, direction: 'down', goalAlignment: 'good' },
      currentWeek: { workouts: 4, minutes: 180, adherencePercent: 100 },
      mostActiveWeek: { workouts: 5, minutes: 220, reason: 'most calories' },
      topExercises: [
        { name: 'Bench Press', totalSets: 24, totalReps: 200, avgRpe: 8, bestWeightKg: 80 },
      ],
      topMuscles: [
        { muscle: 'chest', totalSets: 40 },
        { muscle: 'legs', totalSets: 10 },
      ],
      suggestions: ['Add a dedicated leg day.'],
    });

    expect(ctx.analysisAvailable).toBe('1');
    // -3.2kg over 30 days ≈ -0.7 kg/week.
    expect(ctx.weightVelocityKgPerWeek).toMatch(/down ~0\.7 kg\/week/);
    expect(ctx.weightGoalAlignment).toBe('on track for the goal');
    expect(ctx.currentWeekWorkouts).toBe('4');
    expect(ctx.currentWeekAdherence).toBe('100%');
    expect(ctx.bestWeekSummary).toContain('5 workouts, 220 min');
    expect(ctx.muscleBalanceNote).toContain('chest leads at 80% of sets');
    expect(ctx.muscleBalanceNote).toContain('legs least-trained');
    expect(ctx.topExerciseProgress).toContain('Bench Press');
    expect(ctx.topExerciseProgress).toContain('best 80kg');
    expect(ctx.coachSuggestions).toBe('Add a dedicated leg day.');
  });

  it('marks analysis available even with an empty payload', () => {
    const ctx = {} as PersonalContext;
    applyWeightUpdateToContext(ctx, {});
    expect(ctx.analysisAvailable).toBe('1');
  });
});
