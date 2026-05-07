import { getFirestore, Timestamp } from 'firebase-admin/firestore';

type PlanDay = {
  day?: number;
  title?: string;
  estimatedMinutes?: number;
  exercises?: unknown[];
};

type PlanDoc = {
  days?: PlanDay[];
};

type UserStats = {
  totalWorkouts?: number;
  totalMinutes?: number;
  totalXp?: number;
  longestStreak?: number;
};

type UserDoc = {
  displayName?: string;
  currentPlanId?: string;
  primaryGoal?: string;
  equipment?: string;
  daysPerWeek?: number;
  fitnessLevel?: string;
  stats?: UserStats;
  lastWorkoutAt?: string;
  health?: { injuries?: string[] };
};

// Mirrors lib/gamification.ts: level = floor(totalXp / 1000) + 1.
const LEVEL_XP = 1000;
function levelFromXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / LEVEL_XP) + 1;
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'fat loss',
  build_muscle: 'muscle gain',
  stay_fit: 'staying fit',
  increase_endurance: 'endurance',
  improve_flexibility: 'flexibility',
};

// Total achievements defined in `lib/achievements.ts`.
const ACHIEVEMENT_TOTAL = 16;

// Static warm-up hint keyed loosely on plan day title.
const WARMUP_HINTS: { match: RegExp; hint: string }[] = [
  { match: /push|chest|press|shoulder/i, hint: 'arm circles + push-up to plank' },
  { match: /pull|back|row/i, hint: 'band pull-aparts + scap pulls' },
  { match: /leg|squat|lower|hinge|deadlift/i, hint: 'bodyweight squats + hip openers' },
  { match: /core|abs/i, hint: 'dead bugs + glute bridges' },
  { match: /full body/i, hint: '5 min easy cardio + dynamic stretches' },
  { match: /cardio|run|hiit/i, hint: '5 min easy pace, building gradually' },
];

function warmupHintFor(focus: string): string {
  for (const { match, hint } of WARMUP_HINTS) {
    if (match.test(focus)) return hint;
  }
  return '5 min easy cardio + dynamic stretches';
}

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map((d) => startOfLocalDay(d)));
  const today = startOfLocalDay(new Date());
  let cursor = days.has(today)
    ? today
    : days.has(today - MS_PER_DAY)
      ? today - MS_PER_DAY
      : 0;
  if (!cursor) return 0;
  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor -= MS_PER_DAY;
  }
  return n;
}

export async function fillTemplate(
  template: string,
  uid: string,
): Promise<string> {
  if (!template.includes('{')) return template;

  const ctx: Record<string, string> = {
    firstName: 'there',
    todayFocus: 'rest day',
    todayExerciseCount: '0',
    nextWorkoutDay: 'your next session',
    level: '1',
    totalWorkouts: '0',
    streak: '0',
    weeklyMinutes: '0',
    daysPerWeek: '0',
    goal: 'general fitness',
    equipment: 'whatever you have',
    equipmentList: 'what you have',
    fitnessLevel: 'intermediate',
    recentWorkout: 'your last session',
    lastExercise: 'your last exercise',
    injuries: '',
    achievementProgress: `0/${ACHIEVEMENT_TOTAL}`,
    warmupHint: '5 min easy cardio + dynamic stretches',
  };

  const db = getFirestore();
  let user: UserDoc = {};

  // ---- User profile + onboarding fields ----
  try {
    const userSnap = await db.doc(`users/${uid}`).get();
    user = (userSnap.data() ?? {}) as UserDoc;

    if (user.displayName) {
      ctx.firstName = user.displayName.split(' ')[0] || 'there';
    }
    if (user.daysPerWeek) ctx.daysPerWeek = String(user.daysPerWeek);
    if (user.equipment) {
      ctx.equipment = user.equipment.replace('-', ' ');
      ctx.equipmentList = user.equipment.replace('-', ' ');
    }
    if (user.fitnessLevel) ctx.fitnessLevel = user.fitnessLevel;
    if (user.primaryGoal) {
      ctx.goal = GOAL_LABELS[user.primaryGoal] ?? user.primaryGoal;
    }
    if (user.health?.injuries?.length) {
      ctx.injuries = user.health.injuries.join(', ');
    }

    const stats = user.stats ?? {};
    if (typeof stats.totalWorkouts === 'number') {
      ctx.totalWorkouts = String(stats.totalWorkouts);
    }
    if (typeof stats.totalXp === 'number') {
      ctx.level = String(levelFromXp(stats.totalXp));
    }
  } catch (err) {
    console.warn('[chatbot] personalize: user fetch failed', err);
  }

  // ---- Today's + next plan day ----
  try {
    if (user.currentPlanId) {
      const planSnap = await db
        .doc(`users/${uid}/plans/${user.currentPlanId}`)
        .get();
      const plan = (planSnap.data() ?? {}) as PlanDoc;
      const days = plan.days ?? [];
      if (days.length > 0) {
        const dayIdx = new Date().getDay() % days.length;
        const today = days[dayIdx];
        if (today) {
          const focus = today.title || 'training';
          ctx.todayFocus = focus;
          ctx.todayExerciseCount = String(today.exercises?.length ?? 0);
          ctx.warmupHint = warmupHintFor(focus);
        }
        const nextIdx = (dayIdx + 1) % days.length;
        const nextDay = days[nextIdx];
        if (nextDay?.title) ctx.nextWorkoutDay = nextDay.title;
      }
    }
  } catch (err) {
    console.warn('[chatbot] personalize: plan fetch failed', err);
  }

  // ---- Streak + weekly minutes + recent workout name ----
  try {
    const sevenDaysAgo = Timestamp.fromMillis(
      Date.now() - 30 * MS_PER_DAY, // 30 days back to compute streak; weekly is filtered below
    );
    const recentSnap = await db
      .collection(`users/${uid}/workouts`)
      .where('completedAt', '>=', sevenDaysAgo)
      .orderBy('completedAt', 'desc')
      .limit(60)
      .get();

    const dates: Date[] = [];
    let weeklyMinutes = 0;
    const oneWeekAgo = Date.now() - 7 * MS_PER_DAY;
    let firstDocRead = false;

    recentSnap.forEach((doc) => {
      const data = doc.data();
      const completedAt = data.completedAt as Timestamp | undefined;
      if (!completedAt) return;
      const ms = completedAt.toMillis();
      const d = new Date(ms);
      dates.push(d);
      if (ms >= oneWeekAgo && typeof data.durationMin === 'number') {
        weeklyMinutes += data.durationMin;
      }
      // Pull recentWorkout / lastExercise from the most recent doc only.
      if (!firstDocRead) {
        firstDocRead = true;
        if (typeof data.name === 'string' && data.name.trim()) {
          ctx.recentWorkout = data.name.trim();
        } else if (typeof data.title === 'string' && data.title.trim()) {
          ctx.recentWorkout = data.title.trim();
        }
        const exercises = data.exercises;
        if (Array.isArray(exercises) && exercises.length > 0) {
          const last = exercises[exercises.length - 1];
          if (last && typeof last.name === 'string') {
            ctx.lastExercise = last.name;
          }
        }
      }
    });

    ctx.streak = String(computeStreak(dates));
    ctx.weeklyMinutes = String(Math.round(weeklyMinutes));
  } catch (err) {
    console.warn('[chatbot] personalize: workouts fetch failed', err);
  }

  // ---- Achievement progress ----
  try {
    const achSnap = await db
      .collection(`users/${uid}/achievements`)
      .count()
      .get();
    const unlocked = achSnap.data().count ?? 0;
    ctx.achievementProgress = `${unlocked}/${ACHIEVEMENT_TOTAL}`;
  } catch {
    // count() requires a recent SDK; skip silently if unsupported.
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => ctx[key] ?? '');
}
