import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import type { ChatMemoryDoc } from './types';

// `chat_memory/{uid}` is a single doc per user, updated after every
// successful exchange. It feeds the Gemini prompt so the bot doesn't repeat
// itself across sessions ("you keep telling me to do squats — I have a knee
// issue").

const PATH = (uid: string) => `chat_memory/${uid}`;

// Per-field caps for the rolling arrays. arrayUnion would grow these forever;
// we read-modify-write so the doc stays bounded even after thousands of turns.
const MAX_COMMON_QUESTIONS = 20;
const MAX_DISLIKED_EXERCISES = 50;
const CAPPED_KEYS = new Set(['commonQuestions', 'dislikedExercises']);
const CAP_FOR: Record<string, number> = {
  commonQuestions: MAX_COMMON_QUESTIONS,
  dislikedExercises: MAX_DISLIKED_EXERCISES,
};

function mergeCapped(
  existing: unknown,
  additions: string[],
  cap: number,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (vals: unknown) => {
    if (!Array.isArray(vals)) return;
    for (const v of vals) {
      if (typeof v !== 'string') continue;
      if (seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  };
  push(existing);
  push(additions);
  // Keep the most-recent `cap` entries — newer adds win on overflow.
  return out.length <= cap ? out : out.slice(out.length - cap);
}

export async function loadMemory(uid: string): Promise<ChatMemoryDoc> {
  const db = getFirestore();
  try {
    const snap = await db.doc(PATH(uid)).get();
    if (!snap.exists) return { userId: uid };
    return { userId: uid, ...(snap.data() ?? {}) } as ChatMemoryDoc;
  } catch (err) {
    console.warn('[chatbot] loadMemory failed', err);
    return { userId: uid };
  }
}

export type MemoryPatch = Partial<Omit<ChatMemoryDoc, 'userId'>>;

/**
 * Best-effort merge. We never throw — a memory write failure shouldn't break
 * the user's reply. `commonQuestions` and `dislikedExercises` are appended
 * via arrayUnion if present in the patch.
 */
export async function updateMemory(uid: string, patch: MemoryPatch): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  const db = getFirestore();
  const ref = db.doc(PATH(uid));

  const cappedAdditions: Record<string, string[]> = {};
  const writePatch: Record<string, unknown> = {
    userId: uid,
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue;
    if (CAPPED_KEYS.has(key)) {
      cappedAdditions[key] = value as string[];
    } else {
      writePatch[key] = value;
    }
  }

  try {
    // Read existing values for the capped fields once; merging in memory keeps
    // each array bounded (arrayUnion can only append, not cap).
    if (Object.keys(cappedAdditions).length > 0) {
      const snap = await ref.get();
      const existing = (snap.exists ? snap.data() : {}) ?? {};
      for (const [key, additions] of Object.entries(cappedAdditions)) {
        writePatch[key] = mergeCapped(existing[key], additions, CAP_FOR[key]);
      }
    }
    await ref.set(writePatch, { merge: true });
  } catch (err) {
    console.warn('[chatbot] updateMemory failed', err);
  }
}
