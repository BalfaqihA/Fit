jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from '../recent-searches';
import type { SearchUser } from '@/lib/users';

const KEY = 'community-recent-searches';

const user = (id: string): SearchUser =>
  ({
    id,
    displayName: `User ${id}`,
    handle: `user${id}`,
    bio: '',
    avatarUri: '',
    goals: [],
  }) as SearchUser;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('getRecentSearches', () => {
  it('returns [] when nothing is stored', async () => {
    expect(await getRecentSearches()).toEqual([]);
  });

  it('parses stored JSON', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify([user('1')]));
    const list = await getRecentSearches();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('1');
  });

  it('returns [] when stored value is malformed', async () => {
    await AsyncStorage.setItem(KEY, 'not-json{');
    expect(await getRecentSearches()).toEqual([]);
  });
});

describe('addRecentSearch', () => {
  it('adds a user to the top of the list', async () => {
    await addRecentSearch(user('1'));
    const list = await addRecentSearch(user('2'));
    expect(list.map((u) => u.id)).toEqual(['2', '1']);
  });

  it('de-dupes and moves an existing user to the front', async () => {
    await addRecentSearch(user('1'));
    await addRecentSearch(user('2'));
    const list = await addRecentSearch(user('1'));
    expect(list.map((u) => u.id)).toEqual(['1', '2']);
  });

  it('caps the list at 8 entries', async () => {
    let list: SearchUser[] = [];
    for (let i = 0; i < 12; i++) list = await addRecentSearch(user(String(i)));
    expect(list).toHaveLength(8);
    // newest first: 11..4
    expect(list[0].id).toBe('11');
  });

  it('persists across reads', async () => {
    await addRecentSearch(user('1'));
    expect((await getRecentSearches()).map((u) => u.id)).toEqual(['1']);
  });
});

describe('clearRecentSearches', () => {
  it('removes the stored list', async () => {
    await addRecentSearch(user('1'));
    await clearRecentSearches();
    expect(await getRecentSearches()).toEqual([]);
  });
});
