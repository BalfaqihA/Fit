// Mock Firestore so we can prove the TTL cache spares a re-read on warm
// invocations. The doc set matters less than the call count to `.get()`.

const get = jest.fn();

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({ limit: () => ({ get }) }),
  }),
}));

import {
  __resetKnowledgeCache,
  retrieveKnowledge,
} from '../src/chatbot/knowledgeRetriever';

const docs = [
  {
    id: 'k1',
    title: 'How to squat safely',
    category: 'form',
    content: 'Brace, descend, drive.',
    tags: ['squat', 'form'],
    goal: 'build_muscle',
    fitnessLevel: 'beginner',
  },
  {
    id: 'k2',
    title: 'Daily protein target',
    category: 'nutrition',
    content: 'Aim for 1.6g/kg of bodyweight.',
    tags: ['protein', 'nutrition'],
  },
];

const snap = {
  docs: docs.map((d) => ({ id: d.id, data: () => d })),
};

beforeEach(() => {
  get.mockReset();
  __resetKnowledgeCache();
});

describe('retrieveKnowledge — TTL cache', () => {
  it('hits Firestore once and reuses the cache on subsequent calls', async () => {
    get.mockResolvedValue(snap);
    await retrieveKnowledge({ message: 'squat form', intent: 'exercise_form' });
    await retrieveKnowledge({ message: 'protein intake', intent: 'nutrition_advice' });
    await retrieveKnowledge({ message: 'anything', intent: 'general_chat' });
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('returns relevant docs ranked by score', async () => {
    get.mockResolvedValue(snap);
    const out = await retrieveKnowledge({
      message: 'how do I squat?',
      intent: 'exercise_form',
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].id).toBe('k1');
  });

  it('falls back to the last-good cache when a refresh fails', async () => {
    get.mockResolvedValueOnce(snap);
    await retrieveKnowledge({ message: 'squat', intent: 'exercise_form' });

    // Expire the cache by patching Date.now forwards.
    const realNow = Date.now;
    jest.spyOn(Date, 'now').mockReturnValue(realNow() + 11 * 60 * 1000);
    get.mockRejectedValueOnce(new Error('transient'));

    const out = await retrieveKnowledge({
      message: 'squat',
      intent: 'exercise_form',
    });
    expect(out.length).toBeGreaterThan(0); // served stale rather than empty
    (Date.now as jest.Mock).mockRestore();
  });
});
