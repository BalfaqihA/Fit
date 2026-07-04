import { OVERRIDES, checkOverrides } from '../src/overrides';

// Safety-critical: every crisis category MUST bypass the ML classifier and
// return a vetted reply. A regression here could surface a probabilistic
// answer to a self-harm / medical-emergency message, so we pin each category.

describe('checkOverrides — crisis bypass', () => {
  const cases: { label: string; message: string; intent: string }[] = [
    { label: 'self-harm', message: 'i want to kill myself', intent: 'safety_mental_health' },
    { label: 'suicidal ideation', message: "I don't want to live anymore", intent: 'safety_mental_health' },
    { label: 'acute medical (chest pain)', message: 'I have chest pain during squats', intent: 'safety_acute_medical' },
    { label: 'acute medical (dizzy)', message: 'I feel dizzy and lightheaded', intent: 'safety_acute_medical' },
    { label: 'sharp injury (pop)', message: 'I heard a pop in my knee', intent: 'safety_injury' },
    { label: 'numbness', message: 'I feel numbness in my arm', intent: 'safety_injury' },
    { label: 'disordered eating', message: 'I keep skipping meals to lose weight', intent: 'safety_disordered_eating' },
    { label: 'purging', message: 'is it ok to throw up after eating', intent: 'safety_disordered_eating' },
    { label: 'substances', message: 'what steroid cycle should I run', intent: 'safety_substances' },
    { label: 'sarms', message: 'best sarms for cutting', intent: 'safety_substances' },
    { label: 'pregnancy', message: "I'm pregnant, can I still lift?", intent: 'safety_pregnancy' },
    { label: 'underage', message: "i'm 11 years old can I lift weights", intent: 'safety_underage' },
  ];

  it.each(cases)('flags $label as $intent with a non-empty reply', ({ message, intent }) => {
    const result = checkOverrides(message);
    expect(result).not.toBeNull();
    expect(result!.intent).toBe(intent);
    expect(result!.reply.length).toBeGreaterThan(20);
  });

  it('is case-insensitive', () => {
    expect(checkOverrides('I WANT TO KILL MYSELF')?.intent).toBe('safety_mental_health');
  });

  it('returns null for ordinary fitness questions', () => {
    expect(checkOverrides('how many sets should I do for chest?')).toBeNull();
    expect(checkOverrides('what should I eat after a workout?')).toBeNull();
    expect(checkOverrides('how do I improve my squat depth?')).toBeNull();
  });

  it('returns the first matching override (priority order)', () => {
    // mental-health rule is first in the list — it wins over anything later.
    const result = checkOverrides('i want to die, also what steroid is best');
    expect(result!.intent).toBe('safety_mental_health');
  });

  // Regression guard: these inflected forms were silently NOT matched before
  // the prefix patterns were given `\w*` (bare prefix + trailing \b never
  // matched the inflection). Each MUST now hit its safety override.
  const inflections: { message: string; intent: string }[] = [
    { message: 'I have been having suicidal thoughts', intent: 'safety_mental_health' },
    { message: 'thinking about suicide', intent: 'safety_mental_health' },
    { message: 'am I pregnant if I missed my period', intent: 'safety_pregnancy' },
    { message: 'training during pregnancy', intent: 'safety_pregnancy' },
    { message: "I've been starving myself", intent: 'safety_disordered_eating' },
    { message: 'I think I have anorexia', intent: 'safety_disordered_eating' },
    { message: 'is this bulimia', intent: 'safety_disordered_eating' },
    { message: 'where can I buy steroids', intent: 'safety_substances' },
  ];

  it.each(inflections)('matches inflected form: "$message"', ({ message, intent }) => {
    expect(checkOverrides(message)?.intent).toBe(intent);
  });

  it('does not false-positive "diet" as a death/self-harm phrase', () => {
    // "want to die" must not be widened into "want to diet".
    expect(checkOverrides('I want to diet and lose weight')).toBeNull();
  });

  it('every override has an intent and a substantive reply', () => {
    for (const o of OVERRIDES) {
      expect(o.intent).toMatch(/^safety_/);
      expect(o.reply.length).toBeGreaterThan(20);
      expect(o.pattern).toBeInstanceOf(RegExp);
    }
  });
});
