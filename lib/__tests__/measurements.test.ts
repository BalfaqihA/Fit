jest.mock('firebase/firestore', () =>
  require('../../__mocks__/firestore-mock').firestoreMock(),
);
jest.mock('@/lib/firebase', () => ({ db: {} }));
jest.mock('@/lib/plan-day', () => ({ todayIso: () => '2026-06-22' }));

import type { firestoreMock } from '../../__mocks__/firestore-mock';

import { bmiFromKg, recordWeight } from '../measurements';

const mockApi = jest.requireMock('firebase/firestore') as ReturnType<
  typeof firestoreMock
>;

describe('bmiFromKg', () => {
  it('computes BMI from weight (kg) and height (cm)', () => {
    // 80kg at 200cm => 80 / (2*2) = 20
    expect(bmiFromKg(80, 200)).toBeCloseTo(20, 5);
  });

  it('returns 0 when weight or height is missing', () => {
    expect(bmiFromKg(0, 180)).toBe(0);
    expect(bmiFromKg(70, 0)).toBe(0);
  });
});

describe('recordWeight', () => {
  beforeEach(() => mockApi.__reset());

  it('writes a measurement doc and merges the weight onto the user', async () => {
    const id = await recordWeight('uid1', 72.5);
    const writes = mockApi.__state.writes;

    // Two batched writes: the measurement and the user merge.
    expect(writes).toHaveLength(2);

    const measurement = writes.find((w) =>
      w.path.startsWith('users/uid1/measurements/'),
    );
    expect(measurement).toBeDefined();
    expect((measurement as { data: { weightKg: number } }).data.weightKg).toBe(72.5);

    const userWrite = writes.find((w) => w.path === 'users/uid1');
    expect(userWrite).toBeDefined();
    expect(userWrite?.type).toBe('set');
    const data = (userWrite as { data: Record<string, unknown>; merge?: boolean });
    expect(data.merge).toBe(true);
    expect(data.data.weightKg).toBe(72.5);
    expect(data.data.weightLastUpdatedAt).toBe('2026-06-22');

    // Returns the new measurement doc id.
    expect(id).toBe(measurement!.path.split('/').pop());
  });
});
