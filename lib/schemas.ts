// Tiny hand-rolled validators for Firestore docs. The codebase doesn't pull
// in `zod`/`io-ts` to keep the bundle small; this gives us defense-in-depth
// at the boundary where untyped Firestore data enters typed React land.
//
// Each helper returns `{ ok, value, missing }` so callers can decide whether
// to fall back to a default, log a warning, or surface an error to the user.

import { captureException } from '@/lib/observability';

export type FieldSpec =
  | { kind: 'string'; required?: boolean; default?: string }
  | { kind: 'number'; required?: boolean; default?: number }
  | { kind: 'boolean'; required?: boolean; default?: boolean }
  | { kind: 'array'; required?: boolean }
  | { kind: 'object'; required?: boolean };

export type Schema = Record<string, FieldSpec>;

export type ValidateResult<T> = {
  ok: boolean;
  value: T;
  missing: string[];
  wrongType: string[];
};

function typeOf(v: unknown): string {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  return typeof v;
}

/**
 * Validates a Firestore doc against a flat schema. Returns a possibly
 * partial result and a list of missing/wrong-type keys; callers decide
 * whether to reject the doc or coerce-with-defaults.
 *
 * The intent is *defense in depth*: catch schema drift between the client
 * model and reality (e.g. a future migration adds a required field, or a
 * cloud function writes a number where a string was expected) early —
 * before the bug surfaces as `NaN` in the UI.
 */
export function validateDoc<T extends Record<string, unknown>>(
  raw: unknown,
  schema: Schema,
  area: string,
): ValidateResult<T> {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const out: Record<string, unknown> = {};
  const missing: string[] = [];
  const wrongType: string[] = [];

  for (const [key, spec] of Object.entries(schema)) {
    const v = data[key];
    if (v == null) {
      if (spec.required) missing.push(key);
      if ('default' in spec && spec.default !== undefined) {
        out[key] = spec.default;
      }
      continue;
    }
    const t = typeOf(v);
    const expected =
      spec.kind === 'array'
        ? 'array'
        : spec.kind === 'object'
          ? 'object'
          : spec.kind;
    if (t !== expected) {
      wrongType.push(`${key}: expected ${expected}, got ${t}`);
      if ('default' in spec && spec.default !== undefined) {
        out[key] = spec.default;
      }
      continue;
    }
    out[key] = v;
  }

  const ok = missing.length === 0 && wrongType.length === 0;
  if (!ok) {
    captureException(
      new Error(
        `Schema mismatch in ${area}: missing=${missing.join(',')} wrongType=${wrongType.join('|')}`,
      ),
      { tags: { area: 'schema', op: area } },
    );
  }
  return { ok, value: out as T, missing, wrongType };
}
