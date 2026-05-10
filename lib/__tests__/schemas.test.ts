jest.mock('@/lib/observability', () => ({ captureException: jest.fn() }));

import { validateDoc } from '../schemas';

describe('validateDoc', () => {
  it('returns ok=true when all required fields are present and well-typed', () => {
    const res = validateDoc<{ name: string; age: number }>(
      { name: 'a', age: 30 },
      {
        name: { kind: 'string', required: true },
        age: { kind: 'number', required: true },
      },
      'test',
    );
    expect(res.ok).toBe(true);
    expect(res.value.name).toBe('a');
    expect(res.value.age).toBe(30);
  });

  it('reports missing required fields', () => {
    const res = validateDoc({}, { name: { kind: 'string', required: true } }, 'test');
    expect(res.ok).toBe(false);
    expect(res.missing).toEqual(['name']);
  });

  it('reports wrong types', () => {
    const res = validateDoc(
      { age: 'not-a-number' },
      { age: { kind: 'number', required: true } },
      'test',
    );
    expect(res.ok).toBe(false);
    expect(res.wrongType[0]).toMatch(/age/);
  });

  it('uses default when missing, ok still false if required', () => {
    const res = validateDoc<{ likes: number }>(
      {},
      { likes: { kind: 'number', required: true, default: 0 } },
      'test',
    );
    expect(res.value.likes).toBe(0);
    expect(res.ok).toBe(false);
  });

  it('uses default when missing optional, ok stays true', () => {
    const res = validateDoc<{ likes: number }>(
      {},
      { likes: { kind: 'number', default: 0 } },
      'test',
    );
    expect(res.value.likes).toBe(0);
    expect(res.ok).toBe(true);
  });
});
