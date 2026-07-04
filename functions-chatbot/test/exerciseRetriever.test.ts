// Mock the Firestore read so retrieveExerciseDocs scores an in-memory dataset.
const MOCK = [
  {
    id: 'Pushups',
    name: 'Pushups',
    category: 'strength',
    equipment: 'bodyweight',
    level: 'beginner',
    primaryMuscles: ['chest'],
    instructions: ['Lower your chest to the floor and press back up.'],
  },
  {
    id: 'Goblet_Squat',
    name: 'Goblet Squat',
    category: 'strength',
    equipment: 'dumbbell',
    level: 'beginner',
    primaryMuscles: ['quadriceps'],
    instructions: ['Hold a dumbbell at your chest and squat.'],
  },
  {
    id: 'Bench_Press',
    name: 'Bench Press',
    category: 'strength',
    equipment: 'barbell',
    level: 'intermediate',
    primaryMuscles: ['chest'],
    instructions: ['Press the barbell from your chest.'],
  },
];

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      get: async () => ({
        docs: MOCK.map((d) => ({ id: d.id, data: () => d })),
      }),
    }),
  }),
}));

import { retrieveExerciseDocs } from '../src/chatbot/exerciseRetriever';

describe('retrieveExerciseDocs scoring', () => {
  it('ranks an exact name match first', async () => {
    const out = await retrieveExerciseDocs({
      message: 'how do I do pushups with good form?',
      exerciseNamesFromPlan: [],
    });
    expect(out[0].name).toBe('Pushups');
  });

  it('boosts exercises that are in the plan even if unmentioned', async () => {
    const out = await retrieveExerciseDocs({
      message: "what's my plan today?",
      exerciseNamesFromPlan: ['Goblet Squat'],
    });
    expect(out.map((e) => e.name)).toContain('Goblet Squat');
  });

  it('returns empty when nothing scores', async () => {
    const out = await retrieveExerciseDocs({
      message: 'tell me about taxes',
      exerciseNamesFromPlan: [],
    });
    expect(out).toEqual([]);
  });
});
