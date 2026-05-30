// `searchUsers` issues three Firestore queries in parallel and merges the
// results. We mock `getDocs` to return a different snapshot per call and
// assert on dedupe + self-removal + auth-required behaviour.
//
// Note on the auth mock: jest.mock factories are hoisted ABOVE local const
// declarations, so the state has to live inside the factory closure. The test
// mutates `auth.currentUser` directly on the imported module.

jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'me' } as { uid: string } | null },
}));
jest.mock('@/lib/observability', () => ({ captureException: jest.fn() }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  getDocs: jest.fn(),
  limit: jest.fn(() => 'lim'),
  orderBy: jest.fn(() => 'ob'),
  query: jest.fn(),
  where: jest.fn(() => 'w'),
}));

import { getDocs } from 'firebase/firestore';

import { auth } from '@/lib/firebase';
import { buildUserSearchFields, searchUsers } from '../users';

const mutableAuth = auth as unknown as { currentUser: { uid: string } | null };

const docOf = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  data: () => ({ displayName: id, handle: id, ...extra }),
});

beforeEach(() => {
  (getDocs as jest.Mock).mockReset();
  mutableAuth.currentUser = { uid: 'me' };
});

describe('searchUsers', () => {
  it('returns [] for blank input without hitting Firestore', async () => {
    expect(await searchUsers('   ')).toEqual([]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('returns [] when no user is signed in (rules would reject the read)', async () => {
    mutableAuth.currentUser = null;
    expect(await searchUsers('bob')).toEqual([]);
    expect(getDocs).not.toHaveBeenCalled();
  });

  it('merges across the 3 queries and dedupes by id', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [docOf('a'), docOf('b')] }) // handle
      .mockResolvedValueOnce({ docs: [docOf('b'), docOf('c')] }) // name (b dup)
      .mockResolvedValueOnce({ docs: [docOf('d')] }); // tokens

    const ids = (await searchUsers('x')).map((u) => u.id).sort();
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
  });

  it('drops the signed-in user from results', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [docOf('me'), docOf('a')] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });
    expect((await searchUsers('x')).map((u) => u.id)).toEqual(['a']);
  });

  it('survives a failing array-contains query (older docs have no searchTokens)', async () => {
    (getDocs as jest.Mock)
      .mockResolvedValueOnce({ docs: [docOf('a')] })
      .mockResolvedValueOnce({ docs: [] })
      .mockRejectedValueOnce(new Error('field missing'));
    expect((await searchUsers('x')).map((u) => u.id)).toEqual(['a']);
  });

  it('returns [] on a query-level failure rather than throwing', async () => {
    (getDocs as jest.Mock).mockRejectedValue(new Error('rules denied'));
    expect(await searchUsers('x')).toEqual([]);
  });
});

describe('buildUserSearchFields', () => {
  it('lowercases the prefix mirrors', () => {
    const out = buildUserSearchFields('Ahmed Balfaqeih', 'AhmedB');
    expect(out.displayNameLower).toBe('ahmed balfaqeih');
    expect(out.handleLower).toBe('ahmedb');
  });

  it('emits 1..12-char prefixes for every word so any-word search works', () => {
    const out = buildUserSearchFields('Ahmed Balfaqeih', 'ahmedb');
    expect(out.searchTokens).toContain('a');
    expect(out.searchTokens).toContain('balfaqeih'); // full word
    expect(out.searchTokens).toContain('balf'); // partial — the bug fix tokens
  });

  it('caps the searchTokens array', () => {
    const out = buildUserSearchFields(
      'Aaa Bbb Ccc Ddd Eee Fff Ggg Hhh Iii Jjj Kkk Lll Mmm',
      'handle',
    );
    expect(out.searchTokens.length).toBeLessThanOrEqual(150);
  });
});
