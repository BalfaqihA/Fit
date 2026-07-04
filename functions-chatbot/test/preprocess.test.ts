import { buildVocab, stemTokens, vectorize } from '../src/preprocess';

describe('stemTokens', () => {
  it('returns [] for empty or whitespace input', () => {
    expect(stemTokens('')).toEqual([]);
    expect(stemTokens('   ')).toEqual([]);
  });

  it('collapses training synonyms to a single canonical stem', () => {
    // gym / train / lift / session all normalize to "workout".
    const a = stemTokens('gym');
    const b = stemTokens('lifting');
    const c = stemTokens('training');
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('normalizes body-part synonyms (legs/quads/glutes -> leg)', () => {
    expect(stemTokens('quads')).toEqual(stemTokens('legs'));
    expect(stemTokens('glutes')).toEqual(stemTokens('legs'));
  });

  it('maps food words to the nutrition token', () => {
    expect(stemTokens('protein')).toEqual(stemTokens('diet'));
  });

  it('strips punctuation when applying synonyms', () => {
    // "gym," should still resolve via the stripped form.
    expect(stemTokens('gym,')).toEqual(stemTokens('gym'));
  });

  it('stems plain words it has no synonym for', () => {
    // "running" -> porter stem "run".
    expect(stemTokens('running')).toContain('run');
  });

  it('tokenizes a multi-word sentence', () => {
    const stems = stemTokens('I went to the gym today');
    expect(stems).toContain('workout'); // gym -> workout
    expect(stems.length).toBeGreaterThan(1);
  });
});

describe('buildVocab', () => {
  it('returns a sorted, de-duplicated stem set', () => {
    const vocab = buildVocab(['gym workout', 'workout gym']);
    // Same underlying stems -> deduped.
    const unique = new Set(vocab);
    expect(unique.size).toBe(vocab.length);
    // Sorted ascending.
    expect([...vocab].sort()).toEqual(vocab);
  });

  it('handles an empty corpus', () => {
    expect(buildVocab([])).toEqual([]);
  });
});

describe('vectorize', () => {
  const vocab = buildVocab(['gym', 'protein', 'running']);

  it('produces a 0/1 vector aligned to the vocab', () => {
    const vec = vectorize('running', vocab);
    expect(vec).toHaveLength(vocab.length);
    expect(vec.every((v) => v === 0 || v === 1)).toBe(true);
    // At least the "run" stem dimension is set.
    expect(vec.some((v) => v === 1)).toBe(true);
  });

  it('returns an all-zero vector for out-of-vocab text', () => {
    const vec = vectorize('xylophone', vocab);
    expect(vec).toEqual(vocab.map(() => 0));
  });
});
