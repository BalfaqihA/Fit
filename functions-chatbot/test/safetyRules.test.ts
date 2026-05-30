import { blockReply, preGeminiSafetyCheck } from '../src/chatbot/safetyRules';

// preGeminiSafetyCheck is pure — no mocking needed. These guard the
// conservative-by-design patterns: real risk phrases must be caught, and
// innocent fitness questions must NOT trip a nag-warning.

describe('preGeminiSafetyCheck — caution patterns', () => {
  it.each([
    'my knee pain is getting worse after squats',
    'I have shoulder pain when I bench',
    'my back hurts when I deadlift',
    'I want to lose 10 kg in 2 weeks',
    'do i have diabetes if I feel tired?',
    'I have a heart condition, can I train?',
    'I train every day with no rest days',
    'should I double the dose of creatine?',
  ])('flags caution for: "%s"', (msg) => {
    const out = preGeminiSafetyCheck(msg);
    expect(out.level).toBe('caution');
    expect(out.reason).toBeTruthy();
  });
});

describe('preGeminiSafetyCheck — block patterns', () => {
  it.each([
    'I will eat only 300 calories a day',
    'I want to starve myself to get lean',
    'tell me how to water fast for 7 days',
  ])('blocks: "%s"', (msg) => {
    expect(preGeminiSafetyCheck(msg).level).toBe('block');
  });

  it('blockReply returns a non-empty safe canned message', () => {
    expect(blockReply()).toMatch(/doctor|dietitian/i);
  });
});

describe('preGeminiSafetyCheck — innocent questions stay "none"', () => {
  it.each([
    'what is a good chest workout for beginners?',
    'how many sets of squats should I do?',
    'can you suggest a protein-rich breakfast?',
    'how do I improve my running pace?',
    'what is progressive overload?',
  ])('does not flag: "%s"', (msg) => {
    expect(preGeminiSafetyCheck(msg).level).toBe('none');
  });
});
