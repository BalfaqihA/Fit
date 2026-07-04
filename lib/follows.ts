import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { captureException } from '@/lib/observability';

export const FOLLOWS = 'follows';

export type FollowUserCard = {
  id: string;
  displayName: string;
  handle: string;
  avatarUri: string | null;
  bio: string;
};

export type UserCounts = { followerCount: number; followingCount: number };

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign-in required.');
  return uid;
}

function followDocId(followerId: string, followingId: string): string {
  return `${followerId}_${followingId}`;
}

// `followerCount` / `followingCount` on the user docs are maintained by the
// `on_follow_created` / `on_follow_deleted` triggers in functions/main.py.
// Clients only write the edge doc; the counters are unforgeable.
export async function followUser(targetId: string): Promise<void> {
  const uid = requireUid();
  if (uid === targetId) return;
  try {
    await setDoc(doc(db, FOLLOWS, followDocId(uid, targetId)), {
      followerId: uid,
      followingId: targetId,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    captureException(e, { tags: { area: 'follows', op: 'followUser' } });
    throw e;
  }
}

export async function unfollowUser(targetId: string): Promise<void> {
  const uid = requireUid();
  try {
    await deleteDoc(doc(db, FOLLOWS, followDocId(uid, targetId)));
  } catch (e) {
    captureException(e, { tags: { area: 'follows', op: 'unfollowUser' } });
    throw e;
  }
}

async function resolveUsers(ids: string[]): Promise<FollowUserCard[]> {
  const cards = await Promise.all(
    ids.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'users', id));
        if (!snap.exists()) return null;
        const d = snap.data() as Record<string, unknown>;
        return {
          id,
          displayName: (d.displayName as string) ?? '',
          handle: (d.handle as string) ?? '',
          avatarUri: (d.avatarUri as string | null) ?? null,
          bio: (d.bio as string) ?? '',
        } as FollowUserCard;
      } catch {
        return null;
      }
    })
  );
  return cards.filter((c): c is FollowUserCard => c !== null);
}

/** Users that `uid` follows (realtime). */
export function subscribeFollowing(
  uid: string,
  onChange: (users: FollowUserCard[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, FOLLOWS),
    where('followerId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    async (snap) => {
      const ids = snap.docs.map(
        (d) => (d.data() as { followingId: string }).followingId
      );
      onChange(await resolveUsers(ids));
    },
    (err) => {
      captureException(err, { tags: { area: 'follows', op: 'subscribeFollowing' } });
      onError?.(err);
    }
  );
}

/** Users who follow `uid` (realtime). */
export function subscribeFollowers(
  uid: string,
  onChange: (users: FollowUserCard[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, FOLLOWS),
    where('followingId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    async (snap) => {
      const ids = snap.docs.map(
        (d) => (d.data() as { followerId: string }).followerId
      );
      onChange(await resolveUsers(ids));
    },
    (err) => {
      captureException(err, { tags: { area: 'follows', op: 'subscribeFollowers' } });
      onError?.(err);
    }
  );
}

/** Whether `followerId` currently follows `targetId` (realtime). */
export function subscribeIsFollowing(
  followerId: string,
  targetId: string,
  onChange: (following: boolean) => void
): () => void {
  return onSnapshot(
    doc(db, FOLLOWS, followDocId(followerId, targetId)),
    (snap) => onChange(snap.exists()),
    (err) => {
      captureException(err, {
        tags: { area: 'follows', op: 'subscribeIsFollowing' },
      });
    }
  );
}

/** Follower / following counts from the user doc (realtime). */
export function subscribeUserCounts(
  uid: string,
  onChange: (counts: UserCounts) => void
): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      const d = (snap.data() ?? {}) as Record<string, unknown>;
      onChange({
        followerCount: (d.followerCount as number) ?? 0,
        followingCount: (d.followingCount as number) ?? 0,
      });
    },
    (err) => {
      captureException(err, {
        tags: { area: 'follows', op: 'subscribeUserCounts' },
      });
    }
  );
}
