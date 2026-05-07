import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  where,
  writeBatch,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { captureException } from '@/lib/observability';
import { deleteImage } from '@/lib/upload';

export const POSTS = 'communityPosts';
export const COMMENTS = 'comments';
export const LIKES = 'likes';
export const REPORTS = 'reports';

export const POST_PAGE_SIZE = 10;
export const MAX_CAPTION_LEN = 500;
export const MAX_COMMENT_LEN = 500;
export const MAX_REPORT_REASON_LEN = 300;

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  caption: string;
  imageUrl: string | null;
  imagePath: string | null;
  createdAtMs: number;
  likeCount: number;
  commentCount: number;
};

export type FeedComment = {
  id: string;
  postId: string;
  postOwnerId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAtMs: number;
};

export type LikeDoc = {
  id: string;
  postId: string;
  postOwnerId: string;
  userId: string;
  createdAtMs: number;
};

function tsToMs(t: unknown): number {
  if (t instanceof Timestamp) return t.toMillis();
  return Date.now();
}

export function mapPost(snap: QueryDocumentSnapshot | DocumentSnapshot): FeedPost {
  const d = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    authorId: (d.authorId as string) ?? '',
    authorName: (d.authorName as string) ?? 'Unknown',
    authorAvatarUrl: (d.authorAvatarUrl as string | null) ?? null,
    caption: (d.caption as string) ?? '',
    imageUrl: (d.imageUrl as string | null) ?? null,
    imagePath: (d.imagePath as string | null) ?? null,
    createdAtMs: tsToMs(d.createdAt),
    likeCount: (d.likeCount as number) ?? 0,
    commentCount: (d.commentCount as number) ?? 0,
  };
}

export function mapComment(snap: QueryDocumentSnapshot): FeedComment {
  const d = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    postId: (d.postId as string) ?? '',
    postOwnerId: (d.postOwnerId as string) ?? '',
    authorId: (d.authorId as string) ?? '',
    authorName: (d.authorName as string) ?? 'Unknown',
    authorAvatarUrl: (d.authorAvatarUrl as string | null) ?? null,
    text: (d.text as string) ?? '',
    createdAtMs: tsToMs(d.createdAt),
  };
}

export function mapLike(snap: QueryDocumentSnapshot): LikeDoc {
  const d = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    postId: (d.postId as string) ?? '',
    postOwnerId: (d.postOwnerId as string) ?? '',
    userId: (d.userId as string) ?? '',
    createdAtMs: tsToMs(d.createdAt),
  };
}

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign-in required.');
  return uid;
}

function likeId(postId: string, uid: string): string {
  return `${postId}_${uid}`;
}

// -------- Posts --------

export type CreatePostInput = {
  caption: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
};

export async function createPost(input: CreatePostInput): Promise<string> {
  const uid = requireUid();
  const caption = input.caption.trim();
  if (caption.length > MAX_CAPTION_LEN) {
    throw new Error(`Caption is too long (max ${MAX_CAPTION_LEN}).`);
  }
  if (!caption && !input.imageUrl) {
    throw new Error('Add some text or an image.');
  }
  try {
    const docRef = await addDoc(collection(db, POSTS), {
      authorId: uid,
      authorName: input.authorName,
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      caption,
      imageUrl: input.imageUrl ?? null,
      imagePath: input.imagePath ?? null,
      createdAt: serverTimestamp(),
      likeCount: 0,
      commentCount: 0,
    });
    return docRef.id;
  } catch (e) {
    captureException(e, { tags: { area: 'community', op: 'createPost' } });
    throw e;
  }
}

export async function deletePost(postId: string): Promise<void> {
  requireUid();
  try {
    const postRef = doc(db, POSTS, postId);
    const snap = await getDoc(postRef);
    if (!snap.exists()) return;
    const imagePath = (snap.data() as { imagePath?: string | null }).imagePath ?? null;
    const batch = writeBatch(db);
    batch.delete(postRef);
    await batch.commit();
    if (imagePath) {
      // Best-effort; image deletion is independent of post deletion.
      await deleteImage(imagePath);
    }
  } catch (e) {
    captureException(e, { tags: { area: 'community', op: 'deletePost' } });
    throw e;
  }
}

export function subscribeToFeed(
  pageSize: number,
  onChange: (posts: FeedPost[], lastDoc: QueryDocumentSnapshot | null) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(
    collection(db, POSTS),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  return onSnapshot(
    q,
    (snap) => {
      const posts = snap.docs.map(mapPost);
      const lastDoc = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
      onChange(posts, lastDoc);
    },
    (err) => {
      captureException(err, { tags: { area: 'community', op: 'subscribeToFeed' } });
      onError(err);
    }
  );
}

export async function loadMorePosts(
  cursor: QueryDocumentSnapshot,
  pageSize: number
): Promise<{ posts: FeedPost[]; lastDoc: QueryDocumentSnapshot | null }> {
  const q = query(
    collection(db, POSTS),
    orderBy('createdAt', 'desc'),
    startAfter(cursor),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return {
    posts: snap.docs.map(mapPost),
    lastDoc: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
  };
}

// -------- Likes --------

export async function likePost(post: { id: string; authorId: string }): Promise<void> {
  const uid = requireUid();
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, LIKES, likeId(post.id, uid)), {
      postId: post.id,
      postOwnerId: post.authorId,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, POSTS, post.id), { likeCount: increment(1) });
    await batch.commit();
  } catch (e) {
    captureException(e, { tags: { area: 'community', op: 'likePost' } });
    throw e;
  }
}

export async function unlikePost(postId: string): Promise<void> {
  const uid = requireUid();
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, LIKES, likeId(postId, uid)));
    batch.update(doc(db, POSTS, postId), { likeCount: increment(-1) });
    await batch.commit();
  } catch (e) {
    captureException(e, { tags: { area: 'community', op: 'unlikePost' } });
    throw e;
  }
}

export function subscribeToLikedPostIds(
  uid: string,
  onChange: (ids: Set<string>) => void
): () => void {
  const q = query(collection(db, LIKES), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const ids = new Set<string>();
      snap.forEach((d) => {
        const data = d.data() as { postId?: string };
        if (data.postId) ids.add(data.postId);
      });
      onChange(ids);
    },
    (err) => {
      captureException(err, { tags: { area: 'community', op: 'subscribeLikes' } });
    }
  );
}

// -------- Comments --------

export type AddCommentInput = {
  postId: string;
  postOwnerId: string;
  text: string;
  authorName: string;
  authorAvatarUrl?: string | null;
};

export async function addComment(input: AddCommentInput): Promise<string> {
  const uid = requireUid();
  const text = input.text.trim();
  if (!text) throw new Error('Comment cannot be empty.');
  if (text.length > MAX_COMMENT_LEN) {
    throw new Error(`Comment is too long (max ${MAX_COMMENT_LEN}).`);
  }
  try {
    const batch = writeBatch(db);
    const commentRef = doc(collection(db, COMMENTS));
    batch.set(commentRef, {
      postId: input.postId,
      postOwnerId: input.postOwnerId,
      authorId: uid,
      authorName: input.authorName,
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      text,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, POSTS, input.postId), { commentCount: increment(1) });
    await batch.commit();
    return commentRef.id;
  } catch (e) {
    captureException(e, { tags: { area: 'community', op: 'addComment' } });
    throw e;
  }
}

export async function deleteComment(commentId: string, postId: string): Promise<void> {
  requireUid();
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, COMMENTS, commentId));
    batch.update(doc(db, POSTS, postId), { commentCount: increment(-1) });
    await batch.commit();
  } catch (e) {
    captureException(e, { tags: { area: 'community', op: 'deleteComment' } });
    throw e;
  }
}

export function subscribeToComments(
  postId: string,
  onChange: (comments: FeedComment[]) => void,
  onError: (err: Error) => void
): () => void {
  const q = query(
    collection(db, COMMENTS),
    where('postId', '==', postId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapComment)),
    (err) => {
      captureException(err, { tags: { area: 'community', op: 'subscribeToComments' } });
      onError(err);
    }
  );
}

// -------- Reports --------

export async function reportPost(postId: string, reason: string): Promise<void> {
  const uid = requireUid();
  const trimmed = reason.trim();
  if (!trimmed) throw new Error('Please tell us briefly what is wrong.');
  if (trimmed.length > MAX_REPORT_REASON_LEN) {
    throw new Error(`Report is too long (max ${MAX_REPORT_REASON_LEN}).`);
  }
  try {
    await addDoc(collection(db, REPORTS), {
      postId,
      reportedBy: uid,
      reason: trimmed,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    captureException(e, { tags: { area: 'community', op: 'reportPost' } });
    throw e;
  }
}

// -------- Activity (likes/comments on user's own posts) --------

export function subscribeToOwnPostLikes(
  uid: string,
  onAdded: (like: LikeDoc) => void
): () => void {
  const q = query(collection(db, LIKES), where('postOwnerId', '==', uid));
  let firstSnapshot = true;
  return onSnapshot(
    q,
    (snap) => {
      if (firstSnapshot) {
        firstSnapshot = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const like = mapLike(change.doc);
        if (like.userId === uid) return;
        onAdded(like);
      });
    },
    (err) => {
      captureException(err, { tags: { area: 'community', op: 'subscribeOwnLikes' } });
    }
  );
}

export function subscribeToOwnPostComments(
  uid: string,
  onAdded: (comment: FeedComment) => void
): () => void {
  const q = query(collection(db, COMMENTS), where('postOwnerId', '==', uid));
  let firstSnapshot = true;
  return onSnapshot(
    q,
    (snap) => {
      if (firstSnapshot) {
        firstSnapshot = false;
        return;
      }
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const c = mapComment(change.doc);
        if (c.authorId === uid) return;
        onAdded(c);
      });
    },
    (err) => {
      captureException(err, { tags: { area: 'community', op: 'subscribeOwnComments' } });
    }
  );
}
