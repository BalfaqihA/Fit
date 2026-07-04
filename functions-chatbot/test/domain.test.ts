import { isFitnessDomain, looksLikeExerciseQuery } from '../src/chatbot/domain';
import { correctText } from '../src/typoCorrect';

describe('isFitnessDomain', () => {
  it.each([
    'give me two morning exercises',
    'what can I do for abs at home',
    'suggest 3 high-protein breakfasts',
    'how is my progress this week',
    "what's my streak",
    'how do I log a workout in the app',
    'best stretches for sore legs',
    'how much protein should I eat',
  ])('flags in-domain: "%s"', (msg) => {
    expect(isFitnessDomain(msg)).toBe(true);
  });

  it.each([
    "what's the weather today",
    'write me a python function',
    'who won the football match',
    'what is 2 plus 2',
    'tell me a joke about cats',
  ])('does not flag off-topic: "%s"', (msg) => {
    expect(isFitnessDomain(msg)).toBe(false);
  });
});

describe('looksLikeExerciseQuery', () => {
  it.each([
    'give me two morning exercises',
    'what can I do for abs',
    'replace my squats with something for bad knees',
    'how do I deadlift',
    'a few dumbbell moves for arms',
    'bodyweight routine please',
  ])('flags exercise asks: "%s"', (msg) => {
    expect(looksLikeExerciseQuery(msg)).toBe(true);
  });

  it.each([
    'how many calories should I eat',
    'what is creatine',
    "what's the weather today",
    'how do I feel more motivated',
  ])('does not flag non-exercise asks: "%s"', (msg) => {
    expect(looksLikeExerciseQuery(msg)).toBe(false);
  });
});

describe('typo correction feeds the domain guards', () => {
  it("recognises a typo'd exercise query once corrected", () => {
    const corrected = correctText('give me 2 mroing exerice');
    expect(looksLikeExerciseQuery(corrected)).toBe(true);
    expect(isFitnessDomain(corrected)).toBe(true);
  });
});
