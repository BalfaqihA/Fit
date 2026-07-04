// Configurable Firestore stub for session/message persistence.
let recentDocs: { id: string; get: (k: string) => unknown }[];
let setShouldThrow: boolean;
const NEW_ID = 'generated-id';

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'TS' },
  Timestamp: class {},
  getFirestore: () => ({
    collection: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => ({ get: async () => ({ docs: recentDocs }) }),
        }),
      }),
      doc: () => ({
        id: NEW_ID,
        set: async () => {
          if (setShouldThrow) throw new Error('write failed');
        },
      }),
    }),
    doc: () => ({
      set: async () => {
        if (setShouldThrow) throw new Error('write failed');
      },
    }),
  }),
}));

import {
  appendMessage,
  getOrCreateActiveSession,
} from '../src/chatbot/chatHistoryService';

const tsDoc = (id: string, ageMs: number) => ({
  id,
  get: (_k: string) => ({ toMillis: () => Date.now() - ageMs }),
});

beforeEach(() => {
  recentDocs = [];
  setShouldThrow = false;
});

describe('getOrCreateActiveSession', () => {
  it('reuses a recent session inside the 24h window', async () => {
    recentDocs = [tsDoc('sess-1', 60 * 60 * 1000)]; // 1h old
    expect(await getOrCreateActiveSession('u1')).toBe('sess-1');
  });

  it('creates a new session when the latest one is stale (>24h)', async () => {
    recentDocs = [tsDoc('old', 25 * 60 * 60 * 1000)];
    expect(await getOrCreateActiveSession('u1')).toBe(NEW_ID);
  });

  it('creates a new session when the user has none', async () => {
    recentDocs = [];
    expect(await getOrCreateActiveSession('u1')).toBe(NEW_ID);
  });

  it('forceNew always creates a fresh session', async () => {
    recentDocs = [tsDoc('sess-1', 1000)];
    expect(await getOrCreateActiveSession('u1', { forceNew: true })).toBe(
      NEW_ID,
    );
  });
});

describe('appendMessage', () => {
  it('returns the new message id on success', async () => {
    const id = await appendMessage('sess-1', { role: 'user', text: 'hi' });
    expect(id).toBe(NEW_ID);
  });

  it('is best-effort: returns null instead of throwing on write failure', async () => {
    setShouldThrow = true;
    const id = await appendMessage('sess-1', { role: 'user', text: 'hi' });
    expect(id).toBeNull();
  });
});
