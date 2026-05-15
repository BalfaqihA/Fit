import { getFirestore, FieldValue } from 'firebase-admin/firestore';

import type { ChatMemoryDoc } from './types';

// `chat_memory/{uid}` is a single doc per user, updated after every
// successful exchange. It feeds the Gemini prompt so the bot doesn't repeat
// itself across sessions ("you keep telling me to do squats — I have a knee
// issue").

const PATH = (uid: string) => `chat_memory/${uid}`;

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

  const writePatch: Record<string, unknown> = {
    userId: uid,
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null) continue;
    if (key === 'commonQuestions' || key === 'dislikedExercises') {
      writePatch[key] = FieldValue.arrayUnion(...(value as string[]));
    } else {
      writePatch[key] = value;
    }
  }

  try {
    await ref.set(writePatch, { merge: true });
  } catch (err) {
    console.warn('[chatbot] updateMemory failed', err);
  }
}
