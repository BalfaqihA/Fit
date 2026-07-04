import {
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { captureException } from '@/lib/observability';

export const NOTIFICATIONS = 'notifications';
export const NOTIFICATION_PAGE_SIZE = 50;

export type NotificationType = 'like' | 'comment' | 'follow' | 'new_post';

export type AppNotification = {
  id: string;
  recipientId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  postId: string | null;
  commentText: string | null;
  createdAtMs: number;
  read: boolean;
};

function tsToMs(t: unknown): number {
  if (t instanceof Timestamp) return t.toMillis();
  return Date.now();
}

function mapNotification(snap: QueryDocumentSnapshot): AppNotification {
  const d = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    recipientId: (d.recipientId as string) ?? '',
    type: (d.type as NotificationType) ?? 'like',
    actorId: (d.actorId as string) ?? '',
    actorName: (d.actorName as string) ?? 'Someone',
    actorAvatarUrl: (d.actorAvatarUrl as string | null) ?? null,
    postId: (d.postId as string | null) ?? null,
    commentText: (d.commentText as string | null) ?? null,
    createdAtMs: tsToMs(d.createdAt),
    read: (d.read as boolean) ?? false,
  };
}

/** The signed-in user's in-app notifications, newest first (realtime). */
export function subscribeNotifications(
  uid: string,
  onChange: (items: AppNotification[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, NOTIFICATIONS),
    where('recipientId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(NOTIFICATION_PAGE_SIZE)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapNotification)),
    (err) => {
      captureException(err, {
        tags: { area: 'notifications', op: 'subscribeCommunityNotifications' },
      });
      onError?.(err);
    }
  );
}

/**
 * Mark the given notification ids as read. Ids come from the realtime list
 * already in memory, so no extra query/index is needed. Each update only
 * touches `read` (firestore.rules enforces `hasOnly(['read'])`).
 */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      for (const id of ids.slice(i, i + 450)) {
        batch.update(doc(db, NOTIFICATIONS, id), { read: true });
      }
      await batch.commit();
    }
  } catch (e) {
    captureException(e, {
      tags: { area: 'notifications', op: 'markCommunityNotificationsRead' },
    });
  }
}
