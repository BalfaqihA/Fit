// runTemplatePipeline takes the classification as an input (the tfjs model is
// only loaded by classifyMessage, which we don't call here), so we can drive
// the soft-clarify branch directly. We mock the heavy/IO deps so importing the
// module doesn't load TensorFlow or touch Firestore.
jest.mock('@tensorflow/tfjs', () => ({}));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: { serverTimestamp: jest.fn() },
}));
jest.mock('../src/personalize', () => ({
  // Pass templates through unchanged — placeholder filling is tested elsewhere.
  fillTemplateWithContext: (s: string) => s,
}));

import {
  runTemplatePipeline,
  SOFT_THRESHOLD,
  HARD_THRESHOLD,
  type Classification,
} from '../src/chatbot/templateFallback';
import type { PersonalContext } from '../src/personalize';

// A confidence that lands in the soft-clarify band [SOFT, HARD).
const SOFT_CONF = (SOFT_THRESHOLD + HARD_THRESHOLD) / 2;

const ctx = { __fitnessLevel: 'beginner' } as unknown as PersonalContext;

function run(classification: Classification) {
  return runTemplatePipeline({
    uid: 'u1',
    message: 'hmm not sure',
    history: [],
    previousIntent: null,
    ctx,
    classification,
  });
}

describe('runTemplatePipeline — soft-clarify', () => {
  it('asks "X or Y" when the top two intents differ', async () => {
    const r = await run({
      topTag: 'nutrition_question',
      topConf: SOFT_CONF,
      secondTag: 'ask_workout_advice',
      secondConf: SOFT_CONF - 0.05,
    });
    expect(r.intent).toBe('soft_clarify');
    expect(r.reply).toMatch(/did you mean/i);
    expect(r.reply).toContain('or');
  });

  it('confirms a single topic (no "X or X") when top two intents are identical', async () => {
    const r = await run({
      topTag: 'nutrition_question',
      topConf: SOFT_CONF,
      secondTag: 'nutrition_question',
      secondConf: SOFT_CONF - 0.02,
    });
    expect(r.intent).toBe('soft_clarify');
    // The bug being guarded: must NOT render "did you mean **X** or **X**?"
    expect(r.reply).not.toMatch(/\*\*(.+?)\*\* or \*\*\1\*\*/);
    expect(r.reply).toMatch(/did you want help with/i);
  });

  it('offers tappable topic chips on the soft-clarify branch', async () => {
    const r = await run({
      topTag: 'nutrition_question',
      topConf: SOFT_CONF,
      secondTag: 'ask_workout_advice',
      secondConf: SOFT_CONF - 0.05,
    });
    expect(r.suggestedActions?.length).toBeGreaterThan(0);
  });
});
