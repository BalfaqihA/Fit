import { correctText } from '../src/typoCorrect';

describe('correctText — fixes domain typos', () => {
  it.each([
    ['wrkout', 'workout'],
    ['exerice', 'exercise'],
    ['protien', 'protein'],
    ['rutine', 'routine'],
    ['squt', 'squat'],
  ])('corrects "%s" -> "%s"', (typo, expected) => {
    expect(correctText(typo).toLowerCase()).toContain(expected);
  });

  it('corrects multiple words in a sentence, leaving others intact', () => {
    const out = correctText('give me a wrkout rutine').toLowerCase();
    expect(out).toContain('workout');
    expect(out).toContain('routine');
    expect(out).toContain('give');
  });
});

describe('correctText — safety guards', () => {
  it.each(['diet', 'rep', 'set', 'rip', 'born', 'lean'])(
    'never touches the blocklisted ambiguous word "%s"',
    (w) => {
      expect(correctText(w)).toBe(w);
    },
  );

  it('leaves very short words (<4 chars) alone', () => {
    expect(correctText('lgo')).toBe('lgo');
  });

  it('leaves correctly-spelled known words unchanged', () => {
    expect(correctText('workout')).toBe('workout');
    expect(correctText('nutrition')).toBe('nutrition');
  });

  it('leaves clearly off-domain words alone', () => {
    expect(correctText('weather')).toBe('weather');
    expect(correctText('python')).toBe('python');
  });

  it('preserves digits and punctuation', () => {
    expect(correctText('give me 2 exercises!')).toContain('2');
  });
});
