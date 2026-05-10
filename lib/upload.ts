import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';

import { storage } from '@/lib/firebase';
import { captureException } from '@/lib/observability';

export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024;

export type UploadResult = { url: string; path: string };

export class UploadError extends Error {
  constructor(message: string, public code: 'too-large' | 'bad-type' | 'failed') {
    super(message);
    this.name = 'UploadError';
  }
}

async function fetchAsBlob(localUri: string): Promise<Blob> {
  const res = await fetch(localUri);
  if (!res.ok) {
    throw new UploadError(`Could not read local image (${res.status})`, 'failed');
  }
  return res.blob();
}

export async function uploadImage(
  localUri: string,
  storagePath: string,
  opts: { maxBytes?: number } = {}
): Promise<UploadResult> {
  const maxBytes = opts.maxBytes ?? MAX_POST_IMAGE_BYTES;
  const blob = await fetchAsBlob(localUri);
  if (!blob.type.startsWith('image/')) {
    throw new UploadError('Only image files can be uploaded.', 'bad-type');
  }
  if (blob.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new UploadError(`Image is too large. Max ${mb} MB.`, 'too-large');
  }
  try {
    const objectRef = ref(storage, storagePath);
    await uploadBytes(objectRef, blob, { contentType: blob.type });
    const url = await getDownloadURL(objectRef);
    return { url, path: storagePath };
  } catch (e) {
    captureException(e, { tags: { area: 'upload', op: 'uploadImage' } });
    throw new UploadError('Upload failed. Please try again.', 'failed');
  }
}

export async function deleteImage(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (e) {
    // Treat missing-object as success; surface anything else.
    captureException(e, { tags: { area: 'upload', op: 'deleteImage' } });
  }
}

// Defensive: Firebase Auth UIDs are alphanumeric (Firebase docs guarantee 28
// chars for current SDKs, but we accept 20–64 to stay flexible across legacy
// uids and any future format change). Reject anything else so a future code
// path that built the path from non-auth input cannot escape its prefix
// (e.g. "../" path traversal) or land images in unintended directories.
const SAFE_UID_RE = /^[A-Za-z0-9]{20,64}$/;

function assertSafeUid(userId: string): void {
  if (!SAFE_UID_RE.test(userId)) {
    throw new UploadError('Invalid user id for upload path.', 'failed');
  }
}

export function buildPostImagePath(userId: string): string {
  assertSafeUid(userId);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `communityPosts/${userId}/${ts}_${rand}.jpg`;
}

export function buildProfileImagePath(userId: string, kind: 'avatar' | 'cover'): string {
  assertSafeUid(userId);
  return `users/${userId}/${kind}.jpg`;
}
