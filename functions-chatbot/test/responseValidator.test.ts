import {
  parseAndValidate,
  renderAnswerMarkdown,
} from '../src/chatbot/responseValidator';

describe('parseAndValidate', () => {
  it('parses a clean JSON answer', () => {
    const out = parseAndValidate('{"answer":"Do 3 sets of squats."}');
    expect(out?.answer).toBe('Do 3 sets of squats.');
    expect(out?.confidence).toBe(0.5); // default
    expect(out?.steps).toEqual([]);
  });

  it('strips ```json markdown fences that leaked through', () => {
    const raw = '```json\n{"answer":"hydrate well"}\n```';
    expect(parseAndValidate(raw)?.answer).toBe('hydrate well');
  });

  it('returns null on invalid JSON', () => {
    expect(parseAndValidate('not json at all')).toBeNull();
  });

  it('returns null when the non-negotiable answer field is missing', () => {
    expect(parseAndValidate('{"reason":"because"}')).toBeNull();
  });

  it('returns null for empty input and JSON arrays', () => {
    expect(parseAndValidate('')).toBeNull();
    expect(parseAndValidate('   ')).toBeNull();
    expect(parseAndValidate('["a","b"]')).toBeNull();
  });

  it('caps answer length at 600 chars', () => {
    const long = 'x'.repeat(900);
    const out = parseAndValidate(JSON.stringify({ answer: long }));
    expect(out?.answer.length).toBe(600);
  });

  it('caps steps array at 8 and drops non-strings', () => {
    const steps = [...Array(20).keys()].map((i) => `step ${i}`);
    const out = parseAndValidate(
      JSON.stringify({ answer: 'ok', steps: [...steps, 42, null] }),
    );
    expect(out?.steps.length).toBe(8);
  });

  it('clamps confidence into [0, 1] and falls back on bad types', () => {
    expect(parseAndValidate('{"answer":"a","confidence":5}')?.confidence).toBe(1);
    expect(parseAndValidate('{"answer":"a","confidence":-3}')?.confidence).toBe(0);
    expect(
      parseAndValidate('{"answer":"a","confidence":"high"}')?.confidence,
    ).toBe(0.5);
  });
});

describe('renderAnswerMarkdown', () => {
  it('joins answer + recommendation + steps + warning', () => {
    const md = renderAnswerMarkdown({
      answer: 'Squat deep.',
      personalizedRecommendation: 'For your level, start light.',
      reason: 'protects the knees',
      steps: ['brace core', 'descend slow'],
      safetyWarning: 'stop if it hurts',
      followUpQuestion: '',
      suggestedActions: [],
      confidence: 0.9,
    });
    expect(md).toContain('Squat deep.');
    expect(md).toContain('For your level, start light.');
    expect(md).toContain('_protects the knees_');
    expect(md).toContain('**Steps**');
    expect(md).toContain('1. brace core');
    expect(md).toContain('⚠️');
  });

  it('renders just the answer when nothing else is set', () => {
    const md = renderAnswerMarkdown({
      answer: 'Hydrate.',
      personalizedRecommendation: '',
      reason: '',
      steps: [],
      safetyWarning: '',
      followUpQuestion: '',
      suggestedActions: [],
      confidence: 0.5,
    });
    expect(md).toBe('Hydrate.');
  });
});
