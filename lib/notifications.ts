import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { captureException } from '@/lib/observability';
import { loadJSON, saveJSON } from '@/lib/storage';

const PERM_FLAG_KEY = '@fitlife:notifPermAsked';
const SOFT_PROMPT_KEY = '@fitlife:notifSoftPromptDismissed';
const SCHEDULED_FLAG_KEY = '@fitlife:weighInScheduledId';
const RESUME_FLAG_KEY = '@fitlife:workoutResumeNotifId';
const WEIGH_IN_CHANNEL = 'weigh-in';
const WORKOUT_CHANNEL = 'workout-resume';

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

async function ensureWorkoutChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL, {
    name: 'Workout Resume',
    importance: Notifications.AndroidImportance.HIGH,
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

/**
 * Fire a local notification immediately. Used by community activity (like /
 * comment on the user's own post). No-ops silently if permission is missing or
 * the OS rejects the schedule call.
 */
export async function notifyLocally(title: string, body: string): Promise<void> {
  try {
    const status = await Notifications.getPermissionsAsync();
    if (!status.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch (e) {
    captureException(e, { tags: { area: 'notifications', op: 'notifyLocally' } });
  }
}

/**
 * Fire a local notification immediately telling the user they have a paused
 * workout to come back to. Cancels any prior resume notification first so only
 * one is ever queued. No-op if permission is missing.
 */
export async function notifyResumeWorkout(dayNum?: number): Promise<void> {
  try {
    const status = await Notifications.getPermissionsAsync();
    if (!status.granted) return;
    await ensureWorkoutChannel();
    await cancelResumeReminder();
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Workout paused — tap to resume',
        body:
          dayNum != null
            ? `Day ${dayNum} is waiting for you. Open the app to keep going.`
            : 'You have a workout in progress. Open the app to keep going.',
        ...(Platform.OS === 'android' ? { channelId: WORKOUT_CHANNEL } : {}),
      },
      trigger: null,
    });
    await saveJSON(RESUME_FLAG_KEY, id);
  } catch (e) {
    captureException(e, {
      tags: { area: 'notifications', op: 'notifyResumeWorkout' },
    });
  }
}

export async function cancelResumeReminder(): Promise<void> {
  try {
    const prev = await loadJSON<string | null>(RESUME_FLAG_KEY, null);
    if (prev) {
      await Notifications.cancelScheduledNotificationAsync(prev).catch(
        () => undefined
      );
      await saveJSON(RESUME_FLAG_KEY, null);
    }
  } catch (e) {
    captureException(e, {
      tags: { area: 'notifications', op: 'cancelResumeReminder' },
    });
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
