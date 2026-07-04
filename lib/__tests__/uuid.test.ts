import { randomId } from '../uuid';

describe('randomId', () => {
  it('returns a non-empty string', () => {
    const id = randomId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns different ids on subsequent calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomId()));
    expect(ids.size).toBe(100);
  });
});
