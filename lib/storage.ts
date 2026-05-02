import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureException } from '@/lib/observability';

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    captureException(e, { tags: { area: 'storage', op: 'load' }, context: { key } });
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    captureException(e, { tags: { area: 'storage', op: 'save' }, context: { key } });
  }
}

export const STORAGE_KEYS = {
  profile: '@fitlife:profile',
  posts: '@fitlife:community:posts',
  comments: '@fitlife:community:comments',
  stories: '@fitlife:community:stories',
  follows: '@fitlife:community:follows',
  notifications: '@fitlife:community:notifications',
} as const;
