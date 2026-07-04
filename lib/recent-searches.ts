import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SearchUser } from '@/lib/users';

const KEY = 'community-recent-searches';
const MAX = 8;

/** Most-recently opened search results, newest first. */
export async function getRecentSearches(): Promise<SearchUser[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SearchUser[]) : [];
  } catch {
    return [];
  }
}

/** Add a user to the top of the recent list (de-duped), capped at MAX. */
export async function addRecentSearch(user: SearchUser): Promise<SearchUser[]> {
  try {
    const list = await getRecentSearches();
    const next = [user, ...list.filter((u) => u.id !== user.id)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // best-effort
  }
}
