import {
  getFirestore,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';

import type { ChatMessageDoc } from './types';

// `chat_sessions/{sessionId}` + `chat_sessions/{sessionId}/messages/{mid}`.
// Server is the only writer (admin SDK bypasses rules). Sessions auto-roll
// every 24h of inactivity — one rolling thread per user, with the option of
// an explicit "New chat" from the client.

const SESSIONS = 'chat_sessions';
const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export type ResolveSessionOptions = {
  /** If true, always create a new session regardless of recent activity. Used
   *  by the client's "New chat" button via a future callable. */
  forceNew?: boolean;
};

/**
 * Returns the active session id for `uid`, creating one if no recent session
 * exists. We look up the most recent session by `updatedAt` to avoid an
 * indexed query — single read.
 */
export async function getOrCreateActiveSession(
  uid: string,
  opts: ResolveSessionOptions = {},
): Promise<string> {
  const db = getFirestore();

  if (!opts.forceNew) {
    const recent = await db
      .collection(SESSIONS)
      .where('userId', '==', uid)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();

    const top = recent.docs[0];
    if (top) {
      const updatedAt = top.get('updatedAt') as Timestamp | undefined;
      if (updatedAt && Date.now() - updatedAt.toMillis() < SESSION_TIMEOUT_MS) {
        return top.id;
      }
    }
  }

  const ref = db.collection(SESSIONS).doc();
  await ref.set({
    userId: uid,
    title: 'New conversation',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

/**
 * Append a message to the session's subcollection. Returns the new doc id so
 * the client can attach feedback by id. Best-effort: a write failure logs
 * and returns null so we don't block the user's reply.
 */
export async function appendMessage(
  sessionId: string,
  msg: ChatMessageDoc,
): Promise<string | null> {
  const db = getFirestore();
  try {
    const ref = db.collection(`${SESSIONS}/${sessionId}/messages`).doc();
    await ref.set({
      ...msg,
      createdAt: FieldValue.serverTimestamp(),
    });
    // Touch the parent session so getOrCreateActiveSession() finds it.
    await db.doc(`${SESSIONS}/${sessionId}`).set(
      { updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return ref.id;
  } catch (err) {
    console.warn('[chatbot] appendMessage failed', err);
    return null;
  }
}
