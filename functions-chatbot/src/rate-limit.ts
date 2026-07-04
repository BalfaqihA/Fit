import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Per-user, per-endpoint Firestore-backed token bucket. Cheap (one
 * transactional read+write per call) and survives function cold starts since
 * state lives in Firestore rather than in memory.
 *
 * Throws `resource-exhausted` when the user is over the limit.
 */
export type RateLimitConfig = {
  /** Logical endpoint name; becomes the doc id under `users/{uid}/rateLimits`. */
  endpoint: string;
  /** Maximum requests allowed per `windowMs`. */
  capacity: number;
  /** Window length in ms. */
  windowMs: number;
};

export async function consumeRateLimit(
  uid: string,
  cfg: RateLimitConfig,
): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`users/${uid}/rateLimits/${cfg.endpoint}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as
      | { tokens?: number; refillAt?: number }
      | undefined;

    let tokens =
      data && typeof data.tokens === 'number' ? data.tokens : cfg.capacity;
    const refillAt =
      data && typeof data.refillAt === 'number' ? data.refillAt : now;

    if (now >= refillAt) {
      tokens = cfg.capacity;
    }

    if (tokens <= 0) {
      throw new HttpsError(
        'resource-exhausted',
        'Too many requests. Please slow down.',
      );
    }

    tx.set(
      ref,
      {
        tokens: tokens - 1,
        refillAt: now >= refillAt ? now + cfg.windowMs : refillAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export const SEND_CHAT_LIMIT: RateLimitConfig = {
  endpoint: 'sendChat',
  capacity: 30,
  windowMs: 60 * 1000,
};

export const QUIZ_ANSWER_LIMIT: RateLimitConfig = {
  endpoint: 'quizAnswer',
  capacity: 60,
  windowMs: 60 * 1000,
};
