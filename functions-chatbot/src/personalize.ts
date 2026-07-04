import { getFirestore, Timestamp } from 'firebase-admin/firestore';

type PlanExerciseLite = {
  name?: string;
  sets?: number;
  reps?: number;
  primaryMuscles?: string[];
  equipment?: string;
};

type PlanDay = {
  day?: number;
  title?: string;
  estimatedMinutes?: number;
  exercises?: PlanExerciseLite[];
};

type PlanProfile = {
  goal?: string;
  level?: string;
  equipment?: string;
  daysPerWeek?: number;
  sessionMinutes?: number;
};

type PlanDoc = {
  profile?: PlanProfile;
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
  latestWeightUpdateSummary?: {
    currentKg?: number | null;
    deltaSinceLastKg?: number | null;
    delta30dKg?: number | null;
    currentWeekCalories?: number | null;
    mostActiveWeekCalories?: number | null;
    mostActiveWeekRange?: string | null;
    topExercise?: string | null;
    measurementId?: string | null;
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

// Subset of users/{uid}/insights/latestWeightUpdate (built by
// functions/insights.py → build_weight_update_insight; full shape mirrored in
// hooks/use-weight-update-insights.ts). We read only the fields we analyze.
type LatestWeightUpdate = {
  weight?: {
    delta30dKg?: number;
    direction?: 'up' | 'down' | 'flat';
    goalAlignment?: 'good' | 'neutral' | 'needs_attention';
  };
  currentWeek?: { workouts?: number; minutes?: number; adherencePercent?: number };
  mostActiveWeek?: { workouts?: number; minutes?: number; reason?: string } | null;
  topExercises?: {
    name?: string;
    primaryMuscle?: string | null;
    totalSets?: number;
    totalReps?: number;
    avgRpe?: number | null;
    bestWeightKg?: number | null;
  }[];
  topMuscles?: { muscle?: string; totalSets?: number }[];
  suggestions?: string[];
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

const GOAL_ALIGNMENT_LABELS: Record<string, string> = {
  good: 'on track for the goal',
  neutral: 'neutral',
  needs_attention: 'off track — needs attention',
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
  /**
   * Internal: structured list of today's plan exercises (names only). Mirrors
   * the formatted `todayPlanExercises` string used in the prompt — the
   * orchestrator reads this list instead of re-parsing the formatted line.
   */
  __todayPlanExercisesList?: string[];
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
    // Active-plan tokens (rendered into the CURRENT WORKOUT PLAN prompt block).
    planGoal: '—',
    planDaysPerWeek: '—',
    planSessionMinutes: '—',
    planCompletedThisWeek: '0',
    planPlannedThisWeek: '0',
    todayPlanLine: 'rest day',
    todayPlanExercises: '—',
    nextPlanLine: '—',
    // Latest-weight-update tokens (rendered into the LATEST WEIGHT UPDATE block).
    wuCurrentKg: '—',
    wuDeltaSinceLastKg: '0',
    wuDelta30dKg: '0',
    wuCurrentWeekCalories: '0',
    wuMostActiveWeek: '—',
    wuMostActiveWeekCalories: '0',
    wuTopExercises: '—',
    // Progress-analysis tokens (rendered into the PROGRESS ANALYSIS block).
    analysisAvailable: '0',
    weightVelocityKgPerWeek: '—',
    weightGoalAlignment: '—',
    currentWeekWorkouts: '—',
    currentWeekMinutes: '—',
    currentWeekAdherence: '—',
    bestWeekSummary: '—',
    muscleBalanceNote: '—',
    topExerciseProgress: '—',
    stallNote: '—',
    coachSuggestions: '—',
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
  if (recent.last7d && typeof recent.last7d.workouts === 'number') {
    ctx.planCompletedThisWeek = String(recent.last7d.workouts);
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

  // Progress-analysis fields, derived from the (fresh) snapshot. The richer
  // latestWeightUpdate doc enriches/overrides these afterward when present.
  if (typeof totals.workouts === 'number' && totals.workouts > 0) {
    ctx.analysisAvailable = '1';
  }
  if (typeof flags.hasStalled === 'boolean') {
    ctx.stallNote = flags.hasStalled
      ? 'progress looks plateaued — consider changing volume or intensity'
      : 'progressing normally — no plateau detected';
  }
  if (typeof trend.deltaKg === 'number') {
    ctx.weightVelocityKgPerWeek = formatWeeklyVelocity(trend.deltaKg);
  }
  if (recent.last7d && typeof recent.last7d.workouts === 'number') {
    ctx.currentWeekWorkouts = String(recent.last7d.workouts);
  }
  if (recent.last7d && typeof recent.last7d.minutes === 'number') {
    ctx.currentWeekMinutes = String(recent.last7d.minutes);
  }
  if (typeof consistency.label === 'string') {
    ctx.currentWeekAdherence = consistency.label;
  }

  const wu = snap.latestWeightUpdateSummary;
  if (wu) {
    if (typeof wu.currentKg === 'number') {
      ctx.wuCurrentKg = String(wu.currentKg);
    }
    if (typeof wu.deltaSinceLastKg === 'number') {
      const d = wu.deltaSinceLastKg;
      ctx.wuDeltaSinceLastKg =
        d === 0 ? '0' : `${d < 0 ? 'down' : 'up'} ${Math.abs(d)}`;
    }
    if (typeof wu.delta30dKg === 'number') {
      const d = wu.delta30dKg;
      ctx.wuDelta30dKg =
        d === 0 ? '0' : `${d < 0 ? 'down' : 'up'} ${Math.abs(d)}`;
    }
    if (typeof wu.currentWeekCalories === 'number') {
      ctx.wuCurrentWeekCalories = String(wu.currentWeekCalories);
    }
    if (typeof wu.mostActiveWeekCalories === 'number') {
      ctx.wuMostActiveWeekCalories = String(wu.mostActiveWeekCalories);
    }
    if (typeof wu.mostActiveWeekRange === 'string') {
      ctx.wuMostActiveWeek = wu.mostActiveWeekRange;
    }
    if (typeof wu.topExercise === 'string') {
      ctx.wuTopExercises = wu.topExercise;
    }
  }
}

function formatWeeklyVelocity(delta30dKg: number): string {
  const perWeek = delta30dKg / (30 / 7);
  const mag = Math.abs(perWeek);
  if (mag < 0.05) return 'roughly steady (~0 kg/week)';
  return `${perWeek < 0 ? 'down' : 'up'} ~${mag.toFixed(1)} kg/week`;
}

function formatMuscleBalance(
  muscles: { muscle: string; totalSets: number }[],
): string {
  const total = muscles.reduce((s, m) => s + m.totalSets, 0);
  if (total <= 0) return 'n/a';
  const sorted = [...muscles].sort((a, b) => b.totalSets - a.totalSets);
  const top = sorted[0];
  if (sorted.length === 1) return `all logged volume on ${top.muscle}`;
  const bottom = sorted[sorted.length - 1];
  const topPct = Math.round((top.totalSets / total) * 100);
  return `${top.muscle} leads at ${topPct}% of sets; ${bottom.muscle} least-trained`;
}

/**
 * Enrich the context with the richer `latestWeightUpdate` doc — per-muscle
 * volume, weekly activity, top-exercise detail, and goal alignment. This is
 * what powers genuine progress analysis in the PROGRESS ANALYSIS prompt block.
 */
export function applyWeightUpdateToContext(
  ctx: PersonalContext,
  wu: LatestWeightUpdate,
): void {
  ctx.analysisAvailable = '1';

  const w = wu.weight ?? {};
  if (typeof w.delta30dKg === 'number') {
    ctx.weightVelocityKgPerWeek = formatWeeklyVelocity(w.delta30dKg);
  }
  if (typeof w.goalAlignment === 'string') {
    ctx.weightGoalAlignment =
      GOAL_ALIGNMENT_LABELS[w.goalAlignment] ?? w.goalAlignment;
  }

  const cw = wu.currentWeek ?? {};
  if (typeof cw.workouts === 'number') ctx.currentWeekWorkouts = String(cw.workouts);
  if (typeof cw.minutes === 'number') ctx.currentWeekMinutes = String(cw.minutes);
  if (typeof cw.adherencePercent === 'number') {
    ctx.currentWeekAdherence = `${Math.round(cw.adherencePercent)}%`;
  }

  const mw = wu.mostActiveWeek;
  if (mw && (typeof mw.workouts === 'number' || typeof mw.minutes === 'number')) {
    const reason = mw.reason ? ` (${mw.reason})` : '';
    ctx.bestWeekSummary = `${mw.workouts ?? 0} workouts, ${mw.minutes ?? 0} min${reason}`;
  }

  const muscles = (wu.topMuscles ?? []).filter(
    (m): m is { muscle: string; totalSets: number } =>
      typeof m.muscle === 'string' &&
      typeof m.totalSets === 'number' &&
      m.totalSets > 0,
  );
  if (muscles.length > 0) ctx.muscleBalanceNote = formatMuscleBalance(muscles);

  const ex = (wu.topExercises ?? []).find((e) => typeof e.name === 'string');
  if (ex) {
    const parts: string[] = [ex.name as string];
    if (typeof ex.bestWeightKg === 'number') parts.push(`best ${ex.bestWeightKg}kg`);
    if (typeof ex.totalSets === 'number' && typeof ex.totalReps === 'number') {
      parts.push(`${ex.totalSets} sets / ${ex.totalReps} reps`);
    }
    if (typeof ex.avgRpe === 'number') parts.push(`avg RPE ${ex.avgRpe.toFixed(1)}`);
    ctx.topExerciseProgress = parts.join(', ');
  }

  if (wu.suggestions && wu.suggestions.length > 0) {
    ctx.coachSuggestions = wu.suggestions.slice(0, 2).join(' ');
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

  // Enrich with the richer latestWeightUpdate doc (per-muscle volume, weekly
  // activity, top exercises, goal alignment) for the PROGRESS ANALYSIS block.
  // Sibling of the snapshot; refreshed on weigh-ins. Absence is fine.
  try {
    const wuSnap = await db.doc(`users/${uid}/insights/latestWeightUpdate`).get();
    if (wuSnap.exists) {
      applyWeightUpdateToContext(ctx, wuSnap.data() as LatestWeightUpdate);
    }
  } catch (err) {
    console.warn('[chatbot] personalize: latestWeightUpdate fetch failed', err);
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
      const profile = plan.profile ?? {};
      if (typeof profile.goal === 'string') {
        ctx.planGoal = GOAL_LABELS[profile.goal] ?? profile.goal;
      }
      if (typeof profile.daysPerWeek === 'number') {
        ctx.planDaysPerWeek = String(profile.daysPerWeek);
        ctx.planPlannedThisWeek = String(profile.daysPerWeek);
      } else if (ctx.daysPerWeek !== '0') {
        ctx.planPlannedThisWeek = ctx.daysPerWeek;
      }
      if (typeof profile.sessionMinutes === 'number') {
        ctx.planSessionMinutes = String(profile.sessionMinutes);
      }
      const days = plan.days ?? [];
      if (days.length > 0) {
        const dayIdx = new Date().getDay() % days.length;
        const today = days[dayIdx];
        if (today) {
          const focus = today.title || 'training';
          ctx.todayFocus = focus;
          const exs = today.exercises ?? [];
          ctx.todayExerciseCount = String(exs.length);
          ctx.warmupHint = warmupHintFor(focus);
          ctx.todayPlanLine = `Day ${today.day ?? dayIdx + 1}, ${focus}, ${exs.length} exercises`;
          if (exs.length > 0) {
            const top = exs.slice(0, 6);
            ctx.todayPlanExercises = top
              .map((ex, i) => {
                const muscle = ex.primaryMuscles?.[0] ?? 'mixed';
                const equip = ex.equipment ?? 'bodyweight';
                return `${i + 1}. ${ex.name ?? 'Exercise'} — ${ex.sets ?? '?'}x${ex.reps ?? '?'} — ${muscle} — ${equip}`;
              })
              .join('\n');
            ctx.__todayPlanExercisesList = top
              .map((ex) => (typeof ex.name === 'string' ? ex.name.trim() : ''))
              .filter((n): n is string => !!n);
          }
        }
        const nextIdx = (dayIdx + 1) % days.length;
        const nextDay = days[nextIdx];
        if (nextDay?.title) {
          ctx.nextWorkoutDay = nextDay.title;
          ctx.nextPlanLine = `Day ${nextDay.day ?? nextIdx + 1}, ${nextDay.title}`;
        }
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
