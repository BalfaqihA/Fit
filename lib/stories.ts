import {
  Timestamp,
  addDoc,
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
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

import { auth, db } from '@/lib/firebase';
import { captureException } from '@/lib/observability';
import {
  buildStoryImagePath,
  buildStoryVideoPath,
  uploadImage,
  uploadVideo,
} from '@/lib/upload';

export const STORIES = 'stories';
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_STORY_CAPTION_LEN = 140;

export type Story = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  videoUrl: string | null;
  videoPath: string | null;
  mediaType: 'image' | 'video';
  caption: string | null;
  createdAtMs: number;
  expiresAtMs: number;
};

export type StoryGroup = {
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  stories: Story[];
};

export type StoryViewer = {
  viewerId: string;
  viewerName: string;
  viewerAvatarUrl: string | null;
  viewedAtMs: number;
};

export type CreateStoryInput = {
  imageUri?: string;
  videoUri?: string;
  mediaType?: 'image' | 'video';
  caption?: string;
  authorName: string;
  authorAvatarUrl?: string | null;
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

function mapStory(snap: QueryDocumentSnapshot): Story {
  const d = snap.data() as Record<string, unknown>;
  const expiresAt = d.expiresAt;
  return {
    id: snap.id,
    authorId: (d.authorId as string) ?? '',
    authorName: (d.authorName as string) ?? 'Someone',
    authorAvatarUrl: (d.authorAvatarUrl as string | null) ?? null,
    imageUrl: (d.imageUrl as string | null) ?? null,
    imagePath: (d.imagePath as string | null) ?? null,
    videoUrl: (d.videoUrl as string | null) ?? null,
    videoPath: (d.videoPath as string | null) ?? null,
    mediaType: (d.mediaType as 'image' | 'video') ?? 'image',
    caption: (d.caption as string | null) ?? null,
    createdAtMs: tsToMs(d.createdAt),
    expiresAtMs: typeof expiresAt === 'number' ? expiresAt : tsToMs(expiresAt),
  };
}

function mapViewer(snap: QueryDocumentSnapshot): StoryViewer {
  const d = snap.data() as Record<string, unknown>;
  return {
    viewerId: (d.viewerId as string) ?? snap.id,
    viewerName: (d.viewerName as string) ?? 'Someone',
    viewerAvatarUrl: (d.viewerAvatarUrl as string | null) ?? null,
    viewedAtMs: tsToMs(d.viewedAt),
  };
}

export async function createStory(input: CreateStoryInput): Promise<string> {
  const uid = requireUid();
  const isVideo =
    input.mediaType === 'video' || (!!input.videoUri && !input.imageUri);
  const localUri = isVideo ? input.videoUri : input.imageUri;
  if (!localUri) throw new Error('Pick a photo or video for your story.');
  const caption = (input.caption ?? '').trim();
  if (caption.length > MAX_STORY_CAPTION_LEN) {
    throw new Error(`Caption is too long (max ${MAX_STORY_CAPTION_LEN}).`);
  }
  try {
    let imageUrl: string | null = null;
    let imagePath: string | null = null;
    let videoUrl: string | null = null;
    let videoPath: string | null = null;
    if (isVideo) {
      const r = await uploadVideo(localUri, buildStoryVideoPath(uid));
      videoUrl = r.url;
      videoPath = r.path;
    } else {
      const r = await uploadImage(localUri, buildStoryImagePath(uid));
      imageUrl = r.url;
      imagePath = r.path;
    }
    const ref = await addDoc(collection(db, STORIES), {
      authorId: uid,
      authorName: input.authorName,
      authorAvatarUrl: input.authorAvatarUrl ?? null,
      imageUrl,
      imagePath,
      videoUrl,
      videoPath,
      mediaType: isVideo ? 'video' : 'image',
      caption: caption || null,
      createdAt: serverTimestamp(),
      // `expiresAt` is a plain number (rules require `is number`) so the
      // client can range-filter live stories without a server round-trip.
      expiresAt: Date.now() + STORY_TTL_MS,
    });
    return ref.id;
  } catch (e) {
    captureException(e, { tags: { area: 'stories', op: 'createStory' } });
    throw e;
  }
}

export async function deleteStory(story: {
  id: string;
  imagePath?: string | null;
  videoPath?: string | null;
}): Promise<void> {
  requireUid();
  try {
    await deleteDoc(doc(db, STORIES, story.id));
  } catch (e) {
    captureException(e, { tags: { area: 'stories', op: 'deleteStory' } });
    throw e;
  }
}

/**
 * All live (unexpired) stories, grouped by author. Visible to every
 * signed-in user. The snapshot's `expiresAt > now` filter is evaluated at
 * subscribe time; we re-filter per emission so stories that expire mid-
 * session also drop out.
 */
export function subscribeLiveStories(
  onChange: (groups: StoryGroup[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, STORIES),
    where('expiresAt', '>', Date.now()),
    orderBy('expiresAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const now = Date.now();
      const byAuthor = new Map<string, StoryGroup>();
      snap.docs.forEach((docSnap) => {
        const s = mapStory(docSnap);
        if (s.expiresAtMs <= now) return;
        let g = byAuthor.get(s.authorId);
        if (!g) {
          g = {
            authorId: s.authorId,
            authorName: s.authorName,
            authorAvatarUrl: s.authorAvatarUrl,
            stories: [],
          };
          byAuthor.set(s.authorId, g);
        }
        g.stories.push(s);
      });
      onChange(Array.from(byAuthor.values()));
    },
    (err) => {
      captureException(err, {
        tags: { area: 'stories', op: 'subscribeLiveStories' },
      });
      onError?.(err);
    }
  );
}

/**
 * Record that the signed-in user viewed a story. Idempotent: the doc id is
 * the viewer's uid and rules forbid updates, so we only write the first
 * view (keeping its timestamp stable, Instagram-style).
 */
export async function recordStoryView(
  storyId: string,
  authorId: string,
  viewer: { name: string; avatarUrl?: string | null }
): Promise<void> {
  const uid = requireUid();
  if (uid === authorId) return; // author viewing own story doesn't count
  try {
    const viewRef = doc(db, STORIES, storyId, 'views', uid);
    const existing = await getDoc(viewRef);
    if (existing.exists()) return;
    await setDoc(viewRef, {
      viewerId: uid,
      viewerName: viewer.name,
      viewerAvatarUrl: viewer.avatarUrl ?? null,
      viewedAt: serverTimestamp(),
    });
  } catch (e) {
    // A missed view should never break the viewer UI.
    captureException(e, { tags: { area: 'stories', op: 'recordStoryView' } });
  }
}

/** Who has seen a story (realtime), newest first. */
export function subscribeStoryViews(
  storyId: string,
  onChange: (viewers: StoryViewer[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, STORIES, storyId, 'views'),
    orderBy('viewedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(mapViewer)),
    (err) => {
      captureException(err, {
        tags: { area: 'stories', op: 'subscribeStoryViews' },
      });
      onError?.(err);
    }
  );
}
