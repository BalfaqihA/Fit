import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Daily Gemini quota. Sits on top of the existing per-minute token bucket in
// `rate-limit.ts` — that one prevents flooding, this one caps spend.

export const DAILY_GEMINI_LIMIT = 50;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type QuotaResult = {
  allowed: boolean;
  /** Number of messages already consumed today AFTER this check. Caller can
   *  surface a friendly "X / 50" if desired. */
  countAfter: number;
  /** Today's date in YYYY-MM-DD. */
  date: string;
};

/**
 * Atomically increment today's count and return whether the call is allowed.
 * Reads/writes `chatbot_usage/{uid}`. Rolls the counter to 0 on a new day.
 */
export async function checkAndIncrement(
  uid: string,
  limit: number = DAILY_GEMINI_LIMIT,
): Promise<QuotaResult> {
  const db = getFirestore();
  const ref = db.doc(`chatbot_usage/${uid}`);
  const today = todayKey();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { date?: string; count?: number } | undefined;
    const sameDay = data?.date === today;
    const current = sameDay ? Number(data?.count ?? 0) : 0;

    if (current >= limit) {
      // Still write `date` so we don't accidentally count a roll-over twice.
      tx.set(
        ref,
        { date: today, count: current, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return { allowed: false, countAfter: current, date: today };
    }

    const next = current + 1;
    tx.set(
      ref,
      { date: today, count: next, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { allowed: true, countAfter: next, date: today };
  });
}
