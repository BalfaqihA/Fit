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

type InsightsSnapshot = {
  demographics?: {
    age?: number;
    gender?: string;
    fitnessLevel?: string;
    primaryGoal?: string;
  };
  preferences?: {
    equipment?: string;
    daysPerWeek?: number;
    sessionMinutes?: number;
  };
  totals?: {
    workouts?: number;
    minutesAllTime?: number;
    xpAllTime?: number;
  };
  recent?: {
    last7d?: { workouts?: number; minutes?: number };
    lastWorkoutAt?: string | null;
  };
  streaks?: { current?: number; longest?: number };
  consistency?: { adherence30d?: number; label?: string };
  personalRecords?: {
    exercise: string;
    weightKg: number;
    reps?: number;
    achievedAt?: string;
  }[];
  weightTrend?: {
    current?: number | null;
    deltaKg?: number;
    direction?: 'up' | 'down' | 'flat';
  };
  achievements?: { unlockedCount?: number };
  flags?: {
    trainingAgeDays?: number;
    isNewUser?: boolean;
    hasStalled?: boolean;
    needsWeighIn?: boolean;
  };
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

function computeStreakFromDates(dates: Date[]): number {
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

export type PersonalContext = Record<string, string> & {
  /** Internal: tracked so chat() can derive an automatic styleHint. */
  __fitnessLevel?: string;
};

function defaultContext(): PersonalContext {
  return {
    firstName: 'there',
    todayFocus: 'rest day',
    todayExerciseCount: '0',
    nextWorkoutDay: 'your next session',
    level: '1',
    totalWorkouts: '0',
    streak: '0',
    longestStreak: '0',
    weeklyMinutes: '0',
    daysPerWeek: '0',
    sessionMinutes: '30',
    goal: 'general fitness',
    equipment: 'whatever you have',
    equipmentList: 'what you have',
    fitnessLevel: 'intermediate',
    recentWorkout: 'your last session',
    lastExercise: 'your last exercise',
    injuries: '',
    achievementProgress: `0/${ACHIEVEMENT_TOTAL}`,
    warmupHint: '5 min easy cardio + dynamic stretches',
    // New tokens powered by the insights snapshot — defensive defaults so a
    // missing snapshot can't render templates as 'undefined'.
    currentWeightKg: '—',
    weightDeltaKg: '0',
    weightDirectionWord: 'steady',
    adherenceLabel: 'on-track',
    lastWorkoutDaysAgo: '—',
    topPRName: 'your main lift',
    topPRWeightKg: '—',
    trainingAgeDays: '0',
  };
}

function applySnapshotToContext(
  ctx: PersonalContext,
  snap: InsightsSnapshot,
): void {
  const dem = snap.demographics ?? {};
  const pref = snap.preferences ?? {};
  const totals = snap.totals ?? {};
  const streaks = snap.streaks ?? {};
  const consistency = snap.consistency ?? {};
  const trend = snap.weightTrend ?? {};
  const flags = snap.flags ?? {};
  const recent = snap.recent ?? {};

  if (typeof dem.fitnessLevel === 'string') {
    ctx.fitnessLevel = dem.fitnessLevel;
    ctx.__fitnessLevel = dem.fitnessLevel;
  }
  if (typeof dem.primaryGoal === 'string') {
    ctx.goal = GOAL_LABELS[dem.primaryGoal] ?? dem.primaryGoal;
  }
  if (typeof pref.equipment === 'string') {
    ctx.equipment = pref.equipment.replace('-', ' ');
    ctx.equipmentList = pref.equipment.replace('-', ' ');
  }
  if (typeof pref.daysPerWeek === 'number') {
    ctx.daysPerWeek = String(pref.daysPerWeek);
  }
  if (typeof pref.sessionMinutes === 'number') {
    ctx.sessionMinutes = String(pref.sessionMinutes);
  }
  if (typeof totals.workouts === 'number') {
    ctx.totalWorkouts = String(totals.workouts);
  }
  if (typeof totals.xpAllTime === 'number') {
    ctx.level = String(levelFromXp(totals.xpAllTime));
  }
  if (typeof streaks.current === 'number') ctx.streak = String(streaks.current);
  if (typeof streaks.longest === 'number') {
    ctx.longestStreak = String(streaks.longest);
  }
  if (typeof consistency.label === 'string') {
    ctx.adherenceLabel = consistency.label;
  }
  if (recent.last7d && typeof recent.last7d.minutes === 'number') {
    ctx.weeklyMinutes = String(recent.last7d.minutes);
  }
  if (typeof recent.lastWorkoutAt === 'string') {
    const last = new Date(recent.lastWorkoutAt + 'T00:00:00Z').getTime();
    if (Number.isFinite(last)) {
      const days = Math.max(0, Math.floor((Date.now() - last) / MS_PER_DAY));
      ctx.lastWorkoutDaysAgo = String(days);
    }
  }
  if (typeof trend.current === 'number') ctx.currentWeightKg = String(trend.current);
  if (typeof trend.deltaKg === 'number') {
    // Keep the sign; "down 1.4kg" is more readable than "-1.4kg" in templates.
    ctx.weightDeltaKg = String(Math.abs(trend.deltaKg));
  }
  if (typeof trend.direction === 'string') {
    ctx.weightDirectionWord =
      trend.direction === 'flat' ? 'steady' : trend.direction;
  }
  const topPr = snap.personalRecords?.[0];
  if (topPr) {
    ctx.topPRName = topPr.exercise;
    ctx.topPRWeightKg = String(topPr.weightKg);
  }
  if (typeof flags.trainingAgeDays === 'number') {
    ctx.trainingAgeDays = String(flags.trainingAgeDays);
  }
}

/**
 * Build the personalization context for `uid` exactly once.
 *
 * Fast path: read `users/{uid}/insights/snapshot` (a single denormalized doc
 * maintained by Firestore triggers in `functions/main.py`). Most tokens come
 * from there.
 *
 * Slow path: when the snapshot is missing (new user, not bootstrapped yet,
 * or before the feature ships), fall back to fetching profile + plan +
 * recent workouts + achievement count.
 *
 * Either way, the same `PersonalContext` shape comes out, so callers don't
 * need to know which path ran.
 */
export async function buildPersonalContext(
  uid: string,
): Promise<PersonalContext> {
  const ctx = defaultContext();
  const db = getFirestore();

  // Always read the user doc — we need displayName for {firstName} and
  // currentPlanId for {todayFocus} regardless of snapshot availability.
  let user: UserDoc = {};
  try {
    const snap = await db.doc(`users/${uid}`).get();
    user = (snap.data() ?? {}) as UserDoc;
    if (user.displayName) {
      ctx.firstName = user.displayName.split(' ')[0] || 'there';
    }
    if (user.fitnessLevel) {
      ctx.fitnessLevel = user.fitnessLevel;
      ctx.__fitnessLevel = user.fitnessLevel;
    }
    if (user.health?.injuries?.length) {
      ctx.injuries = user.health.injuries.join(', ');
    }
  } catch (err) {
    console.warn('[chatbot] personalize: user fetch failed', err);
  }

  // Try the snapshot — fast path.
  let usedSnapshot = false;
  try {
    const snap = await db.doc(`users/${uid}/insights/snapshot`).get();
    if (snap.exists) {
      applySnapshotToContext(ctx, snap.data() as InsightsSnapshot);
      usedSnapshot = true;
    }
  } catch (err) {
    console.warn('[chatbot] personalize: snapshot fetch failed', err);
  }

  // Slow path: synthesize the missing fields ourselves.
  if (!usedSnapshot) {
    if (user.daysPerWeek) ctx.daysPerWeek = String(user.daysPerWeek);
    if (user.equipment) {
      ctx.equipment = user.equipment.replace('-', ' ');
      ctx.equipmentList = user.equipment.replace('-', ' ');
    }
    if (user.primaryGoal) {
      ctx.goal = GOAL_LABELS[user.primaryGoal] ?? user.primaryGoal;
    }

    const stats = user.stats ?? {};
    if (typeof stats.totalWorkouts === 'number') {
      ctx.totalWorkouts = String(stats.totalWorkouts);
    }
    if (typeof stats.totalXp === 'number') {
      ctx.level = String(levelFromXp(stats.totalXp));
    }
    if (typeof stats.longestStreak === 'number') {
      ctx.longestStreak = String(stats.longestStreak);
    }

    try {
      const sevenDaysAgo = Timestamp.fromMillis(
        Date.now() - 30 * MS_PER_DAY,
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

      ctx.streak = String(computeStreakFromDates(dates));
      ctx.weeklyMinutes = String(Math.round(weeklyMinutes));
    } catch (err) {
      console.warn('[chatbot] personalize: workouts fetch failed', err);
    }

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
  }

  // Plan-day-derived context (always — snapshot doesn't track which day
  // index we're on right now).
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

  return ctx;
}

/** Pure substitution — no I/O. Use after `buildPersonalContext()`. */
export function fillTemplateWithContext(
  template: string,
  ctx: PersonalContext,
): string {
  if (!template.includes('{')) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => ctx[key] ?? '');
}

/**
 * Convenience for callers that don't want to manage a context themselves.
 * Each call re-reads Firestore — fine for one-shot fills, but wasteful inside
 * a loop. The chat handler builds the context once and uses
 * `fillTemplateWithContext` instead.
 */
export async function fillTemplate(
  template: string,
  uid: string,
): Promise<string> {
  if (!template.includes('{')) return template;
  const ctx = await buildPersonalContext(uid);
  return fillTemplateWithContext(template, ctx);
}
