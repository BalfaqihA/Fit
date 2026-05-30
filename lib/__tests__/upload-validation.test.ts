// Companion to upload-paths.test.ts. Covers the MIME + size gates that run
// before any bytes are sent — the path-builder tests do not exercise them.

jest.mock('@/lib/firebase', () => ({ storage: {} }));
jest.mock('firebase/storage', () => ({
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(async () => 'https://example.test/download'),
  ref: jest.fn(),
  uploadBytes: jest.fn(async () => undefined),
}));
jest.mock('@/lib/observability', () => ({ captureException: jest.fn() }));

import { UploadError, uploadImage, uploadVideo } from '../upload';

function mockFetchOnce(type: string, size: number) {
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    blob: async () => ({ type, size }),
  });
}

describe('uploadImage', () => {
  it('rejects non-image MIME types', async () => {
    mockFetchOnce('application/pdf', 100);
    await expect(uploadImage('file://x', 'path')).rejects.toMatchObject({
      name: 'UploadError',
      code: 'bad-type',
    });
  });

  it('rejects oversized images', async () => {
    mockFetchOnce('image/jpeg', 6 * 1024 * 1024); // > 5 MB default
    await expect(uploadImage('file://x', 'path')).rejects.toMatchObject({
      code: 'too-large',
    });
  });

  it('honours an explicit maxBytes override', async () => {
    mockFetchOnce('image/jpeg', 200_000);
    await expect(
      uploadImage('file://x', 'path', { maxBytes: 100_000 }),
    ).rejects.toBeInstanceOf(UploadError);
  });

  it('passes through and returns the download URL on the happy path', async () => {
    mockFetchOnce('image/jpeg', 100);
    const r = await uploadImage('file://x', 'communityPosts/u/a.jpg');
    expect(r.url).toBe('https://example.test/download');
    expect(r.path).toBe('communityPosts/u/a.jpg');
  });
});

describe('uploadVideo', () => {
  it('rejects non-video MIME types', async () => {
    mockFetchOnce('image/jpeg', 100);
    await expect(uploadVideo('file://x', 'path')).rejects.toMatchObject({
      code: 'bad-type',
    });
  });

  it('rejects oversized videos (> 50 MB default)', async () => {
    mockFetchOnce('video/mp4', 60 * 1024 * 1024);
    await expect(uploadVideo('file://x', 'path')).rejects.toMatchObject({
      code: 'too-large',
    });
  });

  it('returns url + path on the happy path', async () => {
    mockFetchOnce('video/mp4', 1_000_000);
    const r = await uploadVideo('file://x', 'communityPosts/u/v.mp4');
    expect(r.url).toBe('https://example.test/download');
  });
});
