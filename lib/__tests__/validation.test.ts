import {
  parseDurationMin,
  parseEmail,
  parseIntInRange,
  parsePassword,
  parseWeight,
} from '../validation';

describe('parseEmail', () => {
  it.each([
    ['user@example.com', 'user@example.com'],
    ['  USER@Example.COM ', 'user@example.com'],
  ])('accepts %p and returns trimmed lowercase', (input, expected) => {
    const r = parseEmail(input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(expected);
  });

  it.each(['', '   ', 'no-at-sign', 'a@b', 'a@b.', '@nope.com'])(
    'rejects %p',
    (input) => {
      const r = parseEmail(input);
      expect(r.ok).toBe(false);
    },
  );
});

describe('parsePassword', () => {
  it('rejects empty', () => {
    expect(parsePassword('').ok).toBe(false);
  });
  it('rejects under 8 chars', () => {
    expect(parsePassword('abc12').ok).toBe(false);
  });
  it('accepts 8+ chars', () => {
    const r = parsePassword('abcdefgh');
    expect(r.ok).toBe(true);
  });
});

describe('parseIntInRange', () => {
  it('handles comma decimal', () => {
    const r = parseIntInRange('30,5', 0, 100);
    expect(r).toEqual({ ok: true, value: 31 });
  });
  it('rejects non-numeric', () => {
    expect(parseIntInRange('abc', 0, 100).ok).toBe(false);
  });
  it('rejects empty', () => {
    expect(parseIntInRange('', 0, 100).ok).toBe(false);
  });
  it('rejects out-of-range', () => {
    expect(parseIntInRange('200', 0, 100).ok).toBe(false);
    expect(parseIntInRange('-5', 0, 100).ok).toBe(false);
  });
});

describe('parseWeight', () => {
  it('accepts valid kg', () => {
    expect(parseWeight('72.5', 'kg')).toEqual({ ok: true, value: 72.5 });
  });
  it('accepts valid lb (converts internally for bounds check)', () => {
    expect(parseWeight('160', 'lb')).toEqual({ ok: true, value: 160 });
  });
  it('rejects below physiological min', () => {
    expect(parseWeight('10', 'kg').ok).toBe(false);
  });
  it('rejects above physiological max', () => {
    expect(parseWeight('500', 'kg').ok).toBe(false);
  });
  it('rejects non-numeric', () => {
    expect(parseWeight('abc', 'kg').ok).toBe(false);
  });
  it('rejects empty', () => {
    expect(parseWeight('', 'kg').ok).toBe(false);
  });
});

describe('parseDurationMin', () => {
  it('accepts 0..600', () => {
    expect(parseDurationMin('0').ok).toBe(true);
    expect(parseDurationMin('600').ok).toBe(true);
  });
  it('rejects > 600', () => {
    expect(parseDurationMin('700').ok).toBe(false);
  });
  it('rejects negative', () => {
    expect(parseDurationMin('-1').ok).toBe(false);
  });
});
