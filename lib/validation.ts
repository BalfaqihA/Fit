// Shared input parsers/validators. Returning a discriminated `ParseResult`
// (rather than throwing) lets callers render inline error messages without
// try/catch boilerplate.

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// Pragmatic email regex: matches RFC-5322 "email-y" strings without rejecting
// the long tail of legitimate edge cases. The server (Firebase Auth) is the
// authoritative validator — this is just to fail fast in the UI.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmail(input: string): ParseResult<string> {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: 'Email is required.' };
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  return { ok: true, value: trimmed };
}

export const PASSWORD_MIN_LEN = 8;

export function parsePassword(input: string): ParseResult<string> {
  if (!input) return { ok: false, error: 'Password is required.' };
  if (input.length < PASSWORD_MIN_LEN) {
    return {
      ok: false,
      error: `Password must be at least ${PASSWORD_MIN_LEN} characters.`,
    };
  }
  return { ok: true, value: input };
}

/**
 * Parses an integer with a permitted range. Accepts comma decimals from
 * locales that use them ("30,5" → 30 after rounding) but does not silently
 * coerce arbitrary garbage to 0.
 */
export function parseIntInRange(
  input: string,
  min: number,
  max: number,
): ParseResult<number> {
  const cleaned = input.trim().replace(',', '.');
  if (!cleaned) return { ok: false, error: 'Enter a number.' };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'Enter a valid number.' };
  }
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) {
    return { ok: false, error: `Enter a value between ${min} and ${max}.` };
  }
  return { ok: true, value: rounded };
}

/**
 * Parses a weight in the user's chosen unit and returns it as a clean number.
 * Caller decides whether to convert to kg.
 */
export function parseWeight(
  input: string,
  unit: 'kg' | 'lb',
): ParseResult<number> {
  const cleaned = input.trim().replace(',', '.');
  if (!cleaned) return { ok: false, error: 'Enter a weight.' };
  const n = Number(cleaned);
  if (!Number.isFinite(n)) {
    return { ok: false, error: 'Enter a valid number.' };
  }
  // Hard physiological bounds. lbs converted to kg for the comparison so the
  // limits stay equivalent regardless of unit choice.
  const kg = unit === 'lb' ? n * 0.45359237 : n;
  if (kg < 25 || kg > 400) {
    const lo = unit === 'lb' ? 55 : 25;
    const hi = unit === 'lb' ? 880 : 400;
    return {
      ok: false,
      error: `Enter a weight between ${lo} and ${hi} ${unit}.`,
    };
  }
  return { ok: true, value: n };
}

/** Duration in minutes; UI uses 5..240 to match the plan-generation rules. */
export function parseDurationMin(input: string): ParseResult<number> {
  return parseIntInRange(input, 0, 600);
}
