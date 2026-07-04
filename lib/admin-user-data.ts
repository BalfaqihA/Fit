import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';

import { ACHIEVEMENTS, getAchievement } from '@/lib/achievements';
import { db } from '@/lib/firebase';

/**
 * Reads a target user's full progress for the admin "user detail" screen.
 * `firestore.rules` already allows admins to read any `users/{uid}` doc and the
 * workouts / achievements / measurements subcollections, so this runs entirely
 * client-side with the regular SDK (no Cloud Function needed).
 */
export type AdminUserStats = {
  totalWorkouts: number;
  totalMinutes: number;
  totalCaloriesKcal: number;
  totalXp: number;
  longestStreak: number;
};

export type AdminWorkoutRow = {
  id: string;
  completedAtMs: number;
  durationMin: number;
  caloriesKcal: number;
  xp: number;
  exercisesCompleted: number;
  source: string;
};

export type AdminAchievementRow = {
  id: string;
  title: string;
  unlockedAtMs: number | null;
  xpReward: number;
};

export type AdminMeasurementRow = {
  id: string;
  recordedAtMs: number;
  weightKg: number;
};

export type AdminUserProgress = {
  stats: AdminUserStats;
  workouts: AdminWorkoutRow[];
  achievements: AdminAchievementRow[];
  measurements: AdminMeasurementRow[];
  totalAchievements: number;
};

function tsMs(t: unknown): number {
  return (t as Timestamp | undefined)?.toMillis?.() ?? 0;
}

export async function fetchAdminUserProgress(
  uid: string
): Promise<AdminUserProgress> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const rawStats = (userSnap.data()?.stats ?? {}) as Partial<AdminUserStats>;
  const stats: AdminUserStats = {
    totalWorkouts: rawStats.totalWorkouts ?? 0,
    totalMinutes: rawStats.totalMinutes ?? 0,
    totalCaloriesKcal: rawStats.totalCaloriesKcal ?? 0,
    totalXp: rawStats.totalXp ?? 0,
    longestStreak: rawStats.longestStreak ?? 0,
  };

  const ws = await getDocs(
    query(
      collection(db, 'users', uid, 'workouts'),
      orderBy('completedAt', 'desc'),
      limit(50)
    )
  );
  const workouts: AdminWorkoutRow[] = ws.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      completedAtMs: tsMs(x.completedAt),
      durationMin: (x.durationMin as number) ?? 0,
      caloriesKcal: (x.caloriesKcal as number) ?? 0,
      xp: (x.xp as number) ?? 0,
      exercisesCompleted: (x.exercisesCompleted as number) ?? 0,
      source: (x.source as string) ?? 'workout',
    };
  });

  const as = await getDocs(collection(db, 'users', uid, 'achievements'));
  const achievements: AdminAchievementRow[] = as.docs
    .map((d) => {
      const def = getAchievement(d.id);
      const x = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        title: def?.title ?? d.id,
        unlockedAtMs: tsMs(x.unlockedAt) || null,
        xpReward: (x.xpReward as number) ?? def?.xpReward ?? 0,
      };
    })
    .sort((a, b) => (b.unlockedAtMs ?? 0) - (a.unlockedAtMs ?? 0));

  const ms = await getDocs(
    query(
      collection(db, 'users', uid, 'measurements'),
      orderBy('recordedAt', 'desc'),
      limit(50)
    )
  );
  const measurements: AdminMeasurementRow[] = ms.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      recordedAtMs: tsMs(x.recordedAt),
      weightKg: (x.weightKg as number) ?? 0,
    };
  });

  return {
    stats,
    workouts,
    achievements,
    measurements,
    totalAchievements: ACHIEVEMENTS.length,
  };
}
