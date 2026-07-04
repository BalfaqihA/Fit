jest.mock('firebase/firestore', () =>
  require('../../__mocks__/firestore-mock').firestoreMock(),
);
jest.mock('@/lib/firebase', () => ({ db: {} }));

import type { firestoreMock } from '../../__mocks__/firestore-mock';

import { updatePlanDaysPerWeek } from '../plans';

const mockApi = jest.requireMock('firebase/firestore') as ReturnType<
  typeof firestoreMock
>;

describe('updatePlanDaysPerWeek', () => {
  beforeEach(() => mockApi.__reset());

  const lastUpdate = () => {
    const w = mockApi.__state.writes.at(-1);
    return w as { type: string; path: string; data: Record<string, unknown> };
  };

  it('writes daysPerWeek to the plan profile', async () => {
    await updatePlanDaysPerWeek('uid1', 'plan1', 4);
    const w = lastUpdate();
    expect(w.type).toBe('update');
    expect(w.path).toBe('users/uid1/plans/plan1');
    expect(w.data).toEqual({ 'profile.daysPerWeek': 4 });
  });

  it('clamps values above 7 down to 7', async () => {
    await updatePlanDaysPerWeek('uid1', 'plan1', 99);
    expect(lastUpdate().data['profile.daysPerWeek']).toBe(7);
  });

  it('clamps values below 1 up to 1', async () => {
    await updatePlanDaysPerWeek('uid1', 'plan1', 0);
    expect(lastUpdate().data['profile.daysPerWeek']).toBe(1);
  });

  it('rounds fractional inputs', async () => {
    await updatePlanDaysPerWeek('uid1', 'plan1', 3.6);
    expect(lastUpdate().data['profile.daysPerWeek']).toBe(4);
  });
});
