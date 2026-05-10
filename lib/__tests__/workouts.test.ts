import { firestoreMock } from '../../__mocks__/firestore-mock';

const mockApi = firestoreMock();

jest.mock('@/lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => mockApi);
jest.mock('@/lib/plan-day', () => ({ todayIso: () => '2026-05-07' }));
jest.mock('@/lib/gamification', () => ({
  xpForExercise: () => 0,
}));

import { recordCompletedWorkout } from '../workouts';

const KEY = 'test-attempt-key-1';

describe('recordCompletedWorkout idempotency', () => {
  beforeEach(() => {
    mockApi.__reset();
  });

  it('writes the workout doc with the deterministic id on first call', async () => {
    const result = await recordCompletedWorkout('uid1', {
      idempotencyKey: KEY,
      durationMin: 30,
      caloriesKcal: 200,
      exercisesCompleted: 4,
      xp: 100,
    });
    expect(result.alreadyRecorded).toBe(false);
    expect(result.workoutId).toBe(KEY);
    const writes = mockApi.__state.writes.map((w) => w.path);
    expect(writes).toContain(`users/uid1/workouts/${KEY}`);
    expect(writes).toContain(`users/uid1/xp_events/${KEY}`);
    expect(writes).toContain('users/uid1');
  });

  it('does NOT re-grant XP on retry with the same key', async () => {
    await recordCompletedWorkout('uid1', {
      idempotencyKey: KEY,
      durationMin: 30,
      caloriesKcal: 200,
      exercisesCompleted: 4,
      xp: 100,
    });
    const writeCountAfterFirst = mockApi.__state.writes.length;

    const second = await recordCompletedWorkout('uid1', {
      idempotencyKey: KEY,
      durationMin: 30,
      caloriesKcal: 200,
      exercisesCompleted: 4,
      xp: 100,
    });

    expect(second.alreadyRecorded).toBe(true);
    // No new writes should have been issued.
    expect(mockApi.__state.writes.length).toBe(writeCountAfterFirst);
  });

  it('throws if no idempotencyKey is supplied', async () => {
    await expect(
      recordCompletedWorkout('uid1', {
        idempotencyKey: '',
        durationMin: 30,
        caloriesKcal: 200,
        exercisesCompleted: 4,
        xp: 100,
      }),
    ).rejects.toThrow();
  });
});
