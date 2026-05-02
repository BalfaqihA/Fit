import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { captureException } from '@/lib/observability';
import { loadJSON, saveJSON } from '@/lib/storage';

const PERM_FLAG_KEY = '@fitlife:notifPermAsked';
const SOFT_PROMPT_KEY = '@fitlife:notifSoftPromptDismissed';
const SCHEDULED_FLAG_KEY = '@fitlife:weighInScheduledId';
const WEIGH_IN_CHANNEL = 'weigh-in';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(WEIGH_IN_CHANNEL, {
    name: 'Weekly Weigh-In',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Returns true if the app has not yet asked the user for notification
 * permission AND the OS will let us ask. Used to decide whether to show the
 * in-app soft prompt before the irreversible system dialog.
 */
export async function shouldShowNotificationSoftPrompt(): Promise<boolean> {
  try {
    const dismissed = await loadJSON<boolean>(SOFT_PROMPT_KEY, false);
    if (dismissed) return false;
    const status = await Notifications.getPermissionsAsync();
    if (status.granted) return false;
    return status.canAskAgain;
  } catch (e) {
    captureException(e, { tags: { area: 'notifications', op: 'shouldShowSoftPrompt' } });
    return false;
  }
}

export async function dismissNotificationSoftPrompt(): Promise<void> {
  await saveJSON(SOFT_PROMPT_KEY, true);
}

/**
 * Request notification permission once per install. Subsequent calls are no-ops
 * unless the user has revoked permission via OS settings.
 */
export async function requestNotificationPermissionOnce(): Promise<boolean> {
  try {
    const asked = await loadJSON<boolean>(PERM_FLAG_KEY, false);
    const status = await Notifications.getPermissionsAsync();
    if (status.granted) return true;
    if (asked && !status.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync();
    await saveJSON(PERM_FLAG_KEY, true);
    return next.granted;
  } catch (e) {
    captureException(e, { tags: { area: 'notifications', op: 'requestPermission' } });
    return false;
  }
}

/**
 * Schedule a weekly local notification reminding the user to log their weight.
 * Default: every Monday at 9:00am local. Cancels any prior scheduled weigh-in
 * before scheduling the new one so it stays a single recurring entry.
 */
export async function scheduleWeeklyWeighIn(
  weekday: number = 2, // expo: 1 = Sunday, 2 = Monday
  hour: number = 9,
  minute: number = 0
): Promise<string | null> {
  try {
    await ensureChannel();
    await cancelWeeklyWeighIn();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your weekly weigh-in',
        body: 'Open the app and log your weight to keep your stats fresh.',
        ...(Platform.OS === 'android' ? { channelId: WEIGH_IN_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
    await saveJSON(SCHEDULED_FLAG_KEY, id);
    return id;
  } catch (e) {
    captureException(e, { tags: { area: 'notifications', op: 'scheduleWeighIn' } });
    return null;
  }
}

export async function cancelWeeklyWeighIn(): Promise<void> {
  try {
    const prev = await loadJSON<string | null>(SCHEDULED_FLAG_KEY, null);
    if (prev) {
      await Notifications.cancelScheduledNotificationAsync(prev).catch(
        () => undefined
      );
      await saveJSON(SCHEDULED_FLAG_KEY, null);
    }
  } catch (e) {
    captureException(e, { tags: { area: 'notifications', op: 'cancelWeighIn' } });
  }
}
