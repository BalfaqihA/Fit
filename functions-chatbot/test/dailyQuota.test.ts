// In-memory Firestore transaction stub. `stored` is the doc snapshot the
// transaction reads; `writes` captures what the transaction sets.
let stored: Record<string, unknown> | undefined;
let writes: Record<string, unknown>[];

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'TS' },
  getFirestore: () => ({
    doc: (path: string) => ({ path }),
    runTransaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        get: async () => ({ data: () => stored }),
        set: (_ref: unknown, data: Record<string, unknown>) => {
          writes.push(data);
        },
      }),
  }),
}));

import { checkAndIncrement, DAILY_GEMINI_LIMIT } from '../src/chatbot/dailyQuota';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(() => {
  stored = undefined;
  writes = [];
});

describe('checkAndIncrement', () => {
  it('starts a fresh counter at 1 for a brand-new user', async () => {
    const r = await checkAndIncrement('u1');
    expect(r).toMatchObject({ allowed: true, countAfter: 1, date: todayKey() });
    expect(writes[0]).toMatchObject({ count: 1, date: todayKey() });
  });

  it('increments an existing same-day counter', async () => {
    stored = { date: todayKey(), count: 4 };
    const r = await checkAndIncrement('u1');
    expect(r).toMatchObject({ allowed: true, countAfter: 5 });
  });

  it('rejects once the daily limit is reached without double-counting', async () => {
    stored = { date: todayKey(), count: DAILY_GEMINI_LIMIT };
    const r = await checkAndIncrement('u1');
    expect(r.allowed).toBe(false);
    expect(r.countAfter).toBe(DAILY_GEMINI_LIMIT);
    // It still writes the date so a roll-over can't be counted twice.
    expect(writes[0]).toMatchObject({ count: DAILY_GEMINI_LIMIT });
  });

  it('rolls the counter back to 1 on a new day', async () => {
    stored = { date: '2000-01-01', count: 49 };
    const r = await checkAndIncrement('u1');
    expect(r).toMatchObject({ allowed: true, countAfter: 1, date: todayKey() });
  });

  it('honours a custom limit argument', async () => {
    stored = { date: todayKey(), count: 2 };
    expect((await checkAndIncrement('u1', 2)).allowed).toBe(false);
  });
});
