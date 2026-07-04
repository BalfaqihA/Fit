import {
  Timestamp,
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { captureException } from '@/lib/observability';

export const SUPPORT_THREADS = 'supportThreads';
export const MAX_SUPPORT_MESSAGE_LEN = 1000;

export type SupportSenderRole = 'user' | 'admin';

export type SupportMessage = {
  id: string;
  senderId: string;
  senderRole: SupportSenderRole;
  text: string;
  createdAtMs: number;
};

export type SupportThread = {
  uid: string;
  userName: string;
  userEmail: string | null;
  lastMessage: string;
  lastSender: SupportSenderRole;
  lastMessageAtMs: number;
  unreadForAdmin: number;
  unreadForUser: number;
  status: 'open' | 'closed';
};

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign-in required.');
  return uid;
}

function tsToMs(t: unknown): number {
  if (t instanceof Timestamp) return t.toMillis();
  return Date.now();
}

function mapMessage(snap: QueryDocumentSnapshot): SupportMessage {
  const d = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    senderId: (d.senderId as string) ?? '',
    senderRole: (d.senderRole as SupportSenderRole) ?? 'user',
    text: (d.text as string) ?? '',
    createdAtMs: tsToMs(d.createdAt),
  };
}

function mapThread(snap: QueryDocumentSnapshot): SupportThread {
  const d = snap.data() as Record<string, unknown>;
  return {
    uid: snap.id,
    userName: (d.userName as string) ?? 'Member',
    userEmail: (d.userEmail as string | null) ?? null,
    lastMessage: (d.lastMessage as string) ?? '',
    lastSender: (d.lastSender as SupportSenderRole) ?? 'user',
    lastMessageAtMs: tsToMs(d.lastMessageAt),
    unreadForAdmin: (d.unreadForAdmin as number) ?? 0,
    unreadForUser: (d.unreadForUser as number) ?? 0,
    status: (d.status as 'open' | 'closed') ?? 'open',
  };
}

function validate(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Type a message first.');
  if (trimmed.length > MAX_SUPPORT_MESSAGE_LEN) {
    throw new Error(`Message is too long (max ${MAX_SUPPORT_MESSAGE_LEN}).`);
  }
  return trimmed;
}

/**
 * Send a message from the signed-in user to support. Creates the thread doc on
 * first message (so the admin inbox can list it) and records the message in the
 * thread's `messages` subcollection.
 */
export async function sendSupportMessage(
  text: string,
  meta: { name: string; email: string | null }
): Promise<void> {
  const uid = requireUid();
  const trimmed = validate(text);
  try {
    const threadRef = doc(db, SUPPORT_THREADS, uid);
    await setDoc(
      threadRef,
      {
        userId: uid,
        userName: meta.name,
        userEmail: meta.email,
        lastMessage: trimmed,
        lastSender: 'user',
        lastMessageAt: serverTimestamp(),
        unreadForAdmin: increment(1),
        unreadForUser: 0,
        status: 'open',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await addDoc(collection(threadRef, 'messages'), {
      senderId: uid,
      senderRole: 'user',
      text: trimmed,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    captureException(e, { tags: { area: 'support', op: 'sendSupportMessage' } });
    throw e;
  }
}

/** Admin reply into a user's support thread. */
export async function sendAdminSupportReply(
  uid: string,
  text: string
): Promise<void> {
  const adminUid = requireUid();
  const trimmed = validate(text);
  try {
    const threadRef = doc(db, SUPPORT_THREADS, uid);
    await setDoc(
      threadRef,
      {
        lastMessage: trimmed,
        lastSender: 'admin',
        lastMessageAt: serverTimestamp(),
        unreadForUser: increment(1),
        unreadForAdmin: 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await addDoc(collection(threadRef, 'messages'), {
      senderId: adminUid,
      senderRole: 'admin',
      text: trimmed,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    captureException(e, {
      tags: { area: 'support', op: 'sendAdminSupportReply' },
    });
    throw e;
  }
}

/** Reset the unread counter for one side of a thread after it's been read. */
export async function markSupportThreadRead(
  uid: string,
  side: SupportSenderRole
): Promise<void> {
  try {
    await updateDoc(doc(db, SUPPORT_THREADS, uid), {
      [side === 'admin' ? 'unreadForAdmin' : 'unreadForUser']: 0,
    });
  } catch {
    // best-effort — a missing thread just means nothing to clear yet
  }
}

/** Stream the messages of one thread (oldest first). */
export function subscribeSupportMessages(
  uid: string,
  onChange: (messages: SupportMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, SUPPORT_THREADS, uid, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapMessage)),
    (err) => {
      captureException(err, {
        tags: { area: 'support', op: 'subscribeSupportMessages' },
      });
      onError?.(err);
    }
  );
}

/** Admin: stream all support threads, most recently active first. */
export function subscribeSupportThreads(
  onChange: (threads: SupportThread[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, SUPPORT_THREADS),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapThread)),
    (err) => {
      captureException(err, {
        tags: { area: 'support', op: 'subscribeSupportThreads' },
      });
      onError?.(err);
    }
  );
}
