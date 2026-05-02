import {
  collection,
  doc,
  getDocs,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

export type AchievementIconLib = 'ionicons' | 'material-community';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconLib: AchievementIconLib;
  xpReward: number;
  predicate: (ctx: AchievementContext) => boolean;
};

export type AchievementContext = {
  totalWorkouts: number;
  totalMinutes: number;
  totalXp: number;
  longestStreak: number;
  weightLogCount: number;
};

export type UnlockedAchievement = {
  id: string;
  unlockedAt: Date;
  xpReward: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    title: 'First Step',
    description: 'Complete your first workout.',
    icon: 'rocket-launch-outline',
    iconLib: 'material-community',
    xpReward: 50,
    predicate: (c) => c.totalWorkouts >= 1,
  },
  {
    id: 'workouts_10',
    title: 'Getting Started',
    description: 'Complete 10 workouts.',
    icon: 'barbell-outline',
    iconLib: 'ionicons',
    xpReward: 100,
    predicate: (c) => c.totalWorkouts >= 10,
  },
  {
    id: 'workouts_25',
    title: 'Showing Up',
    description: 'Complete 25 workouts.',
    icon: 'ribbon-outline',
    iconLib: 'ionicons',
    xpReward: 250,
    predicate: (c) => c.totalWorkouts >= 25,
  },
  {
    id: 'workouts_50',
    title: 'Committed',
    description: 'Complete 50 workouts.',
    icon: 'medal-outline',
    iconLib: 'ionicons',
    xpReward: 500,
    predicate: (c) => c.totalWorkouts >= 50,
  },
  {
    id: 'workouts_100',
    title: 'Centurion',
    description: 'Complete 100 workouts.',
    icon: 'trophy',
    iconLib: 'ionicons',
    xpReward: 2000,
    predicate: (c) => c.totalWorkouts >= 100,
  },
  {
    id: 'minutes_500',
    title: 'Time Invested',
    description: 'Train for 500 total minutes.',
    icon: 'timer-outline',
    iconLib: 'ionicons',
    xpReward: 250,
    predicate: (c) => c.totalMinutes >= 500,
  },
  {
    id: 'minutes_1000',
    title: 'Endurance',
    description: 'Train for 1,000 total minutes.',
    icon: 'stopwatch-outline',
    iconLib: 'ionicons',
    xpReward: 750,
    predicate: (c) => c.totalMinutes >= 1000,
  },
  {
    id: 'streak_3',
    title: 'On a Roll',
    description: 'Train 3 days in a row.',
    icon: 'flame-outline',
    iconLib: 'ionicons',
    xpReward: 100,
    predicate: (c) => c.longestStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Train 7 days in a row.',
    icon: 'flame',
    iconLib: 'ionicons',
    xpReward: 250,
    predicate: (c) => c.longestStreak >= 7,
  },
  {
    id: 'streak_30',
    title: 'Unstoppable',
    description: 'Train 30 days in a row.',
    icon: 'fire',
    iconLib: 'material-community',
    xpReward: 1000,
    predicate: (c) => c.longestStreak >= 30,
  },
  {
    id: 'xp_1000',
    title: 'Level 2',
    description: 'Earn 1,000 total XP.',
    icon: 'flash-outline',
    iconLib: 'ionicons',
    xpReward: 100,
    predicate: (c) => c.totalXp >= 1000,
  },
  {
    id: 'xp_10000',
    title: 'XP Hunter',
    description: 'Earn 10,000 total XP.',
    icon: 'flash',
    iconLib: 'ionicons',
    xpReward: 750,
    predicate: (c) => c.totalXp >= 10000,
  },
  {
    id: 'minutes_2500',
    title: 'Marathon',
    description: 'Train for 2,500 total minutes.',
    icon: 'hourglass-outline',
    iconLib: 'ionicons',
    xpReward: 1500,
    predicate: (c) => c.totalMinutes >= 2500,
  },
  {
    id: 'xp_5000',
    title: 'XP Climber',
    description: 'Earn 5,000 total XP.',
    icon: 'trending-up',
    iconLib: 'ionicons',
    xpReward: 300,
    predicate: (c) => c.totalXp >= 5000,
  },
  {
    id: 'weight_logs_10',
    title: 'Tracker',
    description: 'Log your weight 10 times.',
    icon: 'scale-bathroom',
    iconLib: 'material-community',
    xpReward: 100,
    predicate: (c) => c.weightLogCount >= 10,
  },
  {
    id: 'weight_logs_50',
    title: 'Consistent',
    description: 'Log your weight 50 times.',
    icon: 'scale-balance',
    iconLib: 'material-community',
    xpReward: 500,
    predicate: (c) => c.weightLogCount >= 50,
  },
];

export function evaluateAchievements(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.predicate(ctx)).map((a) => a.id);
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Reads currently-unlocked achievement IDs, evaluates predicates against the
 * supplied context, and writes any newly-satisfied achievements + bonus
 * `xp_events` + `stats.totalXp` increment in a single batch.
 *
 * Returns the list of achievements unlocked by this call (empty if none).
 */
export async function checkAndUnlockAchievements(
  uid: string,
  ctx: AchievementContext,
): Promise<Achievement[]> {
  const unlockedSnap = await getDocs(
    collection(db, 'users', uid, 'achievements'),
  );
  const already = new Set(unlockedSnap.docs.map((d) => d.id));

  const satisfied = evaluateAchievements(ctx);
  const newlyUnlocked = satisfied.filter((id) => !already.has(id));
  if (newlyUnlocked.length === 0) return [];

  const batch = writeBatch(db);
  let bonusXp = 0;
  const unlocked: Achievement[] = [];

  for (const id of newlyUnlocked) {
    const a = getAchievement(id);
    if (!a) continue;
    unlocked.push(a);

    const achRef = doc(db, 'users', uid, 'achievements', id);
    batch.set(achRef, {
      id: a.id,
      xpReward: a.xpReward,
      unlockedAt: serverTimestamp(),
    });

    const eventRef = doc(collection(db, 'users', uid, 'xp_events'));
    batch.set(eventRef, {
      source: 'achievement',
      achievementId: id,
      xp: a.xpReward,
      createdAt: serverTimestamp(),
    });

    bonusXp += a.xpReward;
  }

  if (bonusXp > 0) {
    const userRef = doc(db, 'users', uid);
    batch.set(
      userRef,
      { stats: { totalXp: increment(bonusXp) } },
      { merge: true },
    );
  }

  await batch.commit();
  return unlocked;
}
