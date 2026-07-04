// We mock the firebase storage import so the path-builder helpers can be
// imported without booting the SDK.
jest.mock('@/lib/firebase', () => ({ storage: {} }));
jest.mock('firebase/storage', () => ({
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
}));
jest.mock('@/lib/observability', () => ({ captureException: jest.fn() }));

import {
  UploadError,
  buildPostImagePath,
  buildProfileImagePath,
} from '../upload';

const VALID_UID = 'abcDEFghi0123456789xyz';

describe('buildPostImagePath', () => {
  it('embeds uid in the path', () => {
    const p = buildPostImagePath(VALID_UID);
    expect(p.startsWith(`communityPosts/${VALID_UID}/`)).toBe(true);
    expect(p.endsWith('.jpg')).toBe(true);
  });

  it('rejects path traversal attempts', () => {
    expect(() => buildPostImagePath('../etc/passwd')).toThrow(UploadError);
  });

  it('rejects too-short uid', () => {
    expect(() => buildPostImagePath('short')).toThrow(UploadError);
  });

  it('rejects characters outside [A-Za-z0-9]', () => {
    expect(() => buildPostImagePath('user@example.com12345')).toThrow(
      UploadError,
    );
  });
});

describe('buildProfileImagePath', () => {
  it('builds avatar path', () => {
    expect(buildProfileImagePath(VALID_UID, 'avatar')).toBe(
      `users/${VALID_UID}/avatar.jpg`,
    );
  });
  it('builds cover path', () => {
    expect(buildProfileImagePath(VALID_UID, 'cover')).toBe(
      `users/${VALID_UID}/cover.jpg`,
    );
  });
  it('rejects bad uid', () => {
    expect(() => buildProfileImagePath('../', 'avatar')).toThrow(UploadError);
  });
});
