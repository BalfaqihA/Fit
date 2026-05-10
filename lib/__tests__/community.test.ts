import { firestoreMock } from '../../__mocks__/firestore-mock';

const mockApi = firestoreMock();

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: { uid: 'uid1' } }, db: {} }));
jest.mock('firebase/firestore', () => mockApi);
jest.mock('@/lib/observability', () => ({ captureException: jest.fn() }));
jest.mock('@/lib/upload', () => ({ deleteImage: jest.fn() }));

import { addComment, likePost, unlikePost } from '../community';

describe('community: counter-side-effect removal (P0.1 invariant)', () => {
  beforeEach(() => mockApi.__reset());

  it('likePost only writes the like doc — no post-counter write', async () => {
    await likePost({ id: 'post1', authorId: 'authorUid' });
    const paths = mockApi.__state.writes.map((w) => w.path);
    // Like doc written:
    expect(paths).toContain('likes/post1_uid1');
    // No write to the post itself (counter is server-maintained):
    expect(paths.some((p) => p === 'communityPosts/post1')).toBe(false);
  });

  it('unlikePost only deletes the like doc', async () => {
    mockApi.__seedDoc('likes/post1_uid1', {
      postId: 'post1',
      userId: 'uid1',
    });
    await unlikePost('post1');
    const writes = mockApi.__state.writes;
    expect(writes).toEqual([{ type: 'delete', path: 'likes/post1_uid1' }]);
  });
});

describe('community: addComment owner derivation (P0.5)', () => {
  beforeEach(() => mockApi.__reset());

  it('reads the post and stamps the comment with the actual authorId', async () => {
    mockApi.__seedDoc('communityPosts/post1', { authorId: 'realOwner' });
    await addComment({
      postId: 'post1',
      text: 'hello',
      authorName: 'Test',
    });
    const commentWrites = mockApi.__state.writes.filter((w) =>
      w.path.startsWith('comments/'),
    );
    expect(commentWrites.length).toBe(1);
    const data = commentWrites[0].type === 'set' ? commentWrites[0].data : null;
    expect((data as { postOwnerId: string }).postOwnerId).toBe('realOwner');
  });

  it('throws if the post does not exist', async () => {
    await expect(
      addComment({ postId: 'missing', text: 'hi', authorName: 'T' }),
    ).rejects.toThrow();
  });
});
