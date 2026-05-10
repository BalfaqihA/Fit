// Lightweight unique-id helper used as idempotency keys for Firestore writes.
// Prefers `crypto.randomUUID` when available (Hermes 0.74+, web), falls back to
// a 32-char hex string from `Math.random` which is more than enough entropy
// for collision-safe per-user document ids.
export function randomId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}
