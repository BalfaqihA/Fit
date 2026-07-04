import type { PersonalContext } from '../personalize';

import type {
  BroadIntent,
  ChatHistoryEntry,
  ChatMemoryDoc,
  KnowledgeDoc,
  SafetyDecision,
} from './types';

// Build the (systemInstruction, userPrompt) pair we hand to Gemini. The
// system instruction is constant; the user prompt is fully derived from
// inputs the orchestrator already gathered.

const SYSTEM_INSTRUCTION = `You are a personalized fitness coach inside a mobile app called Fit.

You will receive the user's profile, their long-term chat memory, retrieved knowledge base entries, a detected intent, and a safety level. Use ALL of these to give safe, specific, personalized advice.

Hard rules:
- Never recommend extreme dieting (under ~1200 cal/day for women, ~1500 for men), unprescribed supplements, or training through pain.
- When safety level is "caution", explicitly acknowledge the concern in the safetyWarning field and adapt the plan.
- DOMAIN GATE: You ONLY decline messages that are genuinely NOT about fitness, training, exercise, nutrition, recovery, body metrics, progress/stats, or using the Fit app (e.g. coding, news, math, relationships, other apps). For those — and ONLY those — set "answer" to one friendly sentence redirecting the user to ask about their training, set "confidence" to 0, and leave every other field empty. Anything fitness/app-related is IN scope.
- ALWAYS ANSWER IN-DOMAIN QUESTIONS: For any fitness/app question, never refuse, stall, or say you "can't help with that" — give a concrete, specific, useful answer every time. Do not ask the user to clarify before answering unless the request is truly impossible to act on; make a reasonable assumption and answer.
- HONOR REQUESTED COUNTS: If the user asks for a specific number of items ("two exercises", "give me 3 meals", "a couple of stretches"), return exactly that many concrete, NAMED items in "steps" — each its own bullet with the name plus a brief how/why. Prefer named entries from the KNOWLEDGE BASE block; if it lacks them, use your own knowledge but stay safe and specific. If no count is given, default to 3-5.
- EXERCISE REQUESTS: Name real, specific exercises (e.g. "Goblet squat — 3×10") with sets/reps and one form cue each, tailored to the user's equipment, fitness level, and any injuries from the USER PROFILE. Never answer an exercise request with only generic principles.
- Reference the user's actual numbers (streak, weight, PR) when they're relevant — don't just say "your goals", say "your goal of {goal}".
- DATA-DRIVEN ANALYSIS: When the user asks how they're doing / about progress, weight, stats, streak, PRs, or muscle balance, ANALYZE the PROGRESS ANALYSIS and RECENT ACTIVITY blocks instead of giving generic advice. Cite their real numbers, state the trend in plain words (e.g. "you're down ~0.8 kg/week — on track for fat loss"), compare this week to their best week, call out any muscle-group imbalance or plateau, and end with one concrete next step. If a metric is missing, tell them what to log (workout / weigh-in) to unlock it.
- If a knowledge base entry is relevant, weave it into the answer; otherwise rely on your own knowledge.
- Keep "answer" to 1-2 sentences. Put depth into "personalizedRecommendation" and "steps".
- "steps" should be 3-5 concrete bullets. Skip steps entirely if the question doesn't need a plan.
- "suggestedActions" are short follow-up prompts (max 4) the user can tap.
- "confidence" is your subjective 0-1 self-rating.
- If you genuinely don't know, say so honestly in "answer" rather than guessing.

You MUST respond with ONLY a single JSON object matching this exact schema (no markdown fences, no commentary before or after):

{
  "answer": string,
  "personalizedRecommendation": string,
  "reason": string,
  "steps": string[],
  "safetyWarning": string,
  "followUpQuestion": string,
  "suggestedActions": string[],
  "confidence": number
}

If a field doesn't apply, use an empty string or empty array — do not omit fields.`;

export type PromptInputs = {
  message: string;
  personal: PersonalContext;
  memory: ChatMemoryDoc;
  knowledge: KnowledgeDoc[];
  intent: BroadIntent;
  safety: SafetyDecision;
  history: ChatHistoryEntry[];
};

function tokenOrFallback(v: string | undefined, fallback: string): string {
  if (!v || v === '—' || v === 'undefined') return fallback;
  return v;
}

function renderProfileBlock(ctx: PersonalContext): string {
  const name = tokenOrFallback(ctx.firstName, 'the user');
  const level = tokenOrFallback(ctx.fitnessLevel, 'unknown');
  const goal = tokenOrFallback(ctx.goal, 'general fitness');
  const equipment = tokenOrFallback(ctx.equipment, 'unknown');
  const dpw = tokenOrFallback(ctx.daysPerWeek, 'unknown');
  const session = tokenOrFallback(ctx.sessionMinutes, '30');
  const injuries = ctx.injuries && ctx.injuries.trim()
    ? ctx.injuries
    : 'none reported';
  const weight = tokenOrFallback(ctx.currentWeightKg, 'unknown');
  const weightWord = tokenOrFallback(ctx.weightDirectionWord, 'steady');
  const weightDelta = tokenOrFallback(ctx.weightDeltaKg, '0');

  return [
    'USER PROFILE',
    `- Name: ${name}`,
    `- Goal: ${goal}`,
    `- Fitness level: ${level}`,
    `- Training days/week: ${dpw}, session length: ${session} min`,
    `- Equipment: ${equipment}`,
    `- Injuries / limitations: ${injuries}`,
    `- Current weight: ${weight}kg (30-day trend: ${weightWord} ${weightDelta}kg)`,
  ].join('\n');
}

function renderActivityBlock(ctx: PersonalContext): string {
  return [
    'RECENT ACTIVITY',
    `- Total workouts: ${tokenOrFallback(ctx.totalWorkouts, '0')}`,
    `- Current streak: ${tokenOrFallback(ctx.streak, '0')} days (best: ${tokenOrFallback(ctx.longestStreak, '0')})`,
    `- 30-day adherence: ${tokenOrFallback(ctx.adherenceLabel, 'unknown')}`,
    `- Last workout: ${tokenOrFallback(ctx.lastWorkoutDaysAgo, 'unknown')} day(s) ago`,
    `- Top PR: ${tokenOrFallback(ctx.topPRName, 'n/a')} at ${tokenOrFallback(ctx.topPRWeightKg, 'n/a')}kg`,
    `- Today's plan focus: ${tokenOrFallback(ctx.todayFocus, 'rest day')}`,
  ].join('\n');
}

function renderPlanBlock(ctx: PersonalContext): string {
  const goal = tokenOrFallback(
    ctx.planGoal,
    tokenOrFallback(ctx.goal, 'general fitness'),
  );
  const dpw = tokenOrFallback(
    ctx.planDaysPerWeek,
    tokenOrFallback(ctx.daysPerWeek, 'unknown'),
  );
  const session = tokenOrFallback(
    ctx.planSessionMinutes,
    tokenOrFallback(ctx.sessionMinutes, '30'),
  );
  const completed = tokenOrFallback(ctx.planCompletedThisWeek, '0');
  const planned = tokenOrFallback(ctx.planPlannedThisWeek, dpw);
  const todayLine = tokenOrFallback(ctx.todayPlanLine, 'rest day');
  const exercises = tokenOrFallback(ctx.todayPlanExercises, '(none scheduled)');

  return [
    'CURRENT WORKOUT PLAN',
    `- Plan goal: ${goal}`,
    `- Days/week: ${dpw}`,
    `- Session length: ${session} min`,
    `- Completed this week: ${completed}/${planned}`,
    `- Today's workout: ${todayLine}`,
    '',
    "Today's exercises:",
    exercises,
    '',
    "If the user asks for today's plan, answer from this block. If the user asks for replacements, match the same muscle, level, and available equipment.",
  ].join('\n');
}

function renderWeightUpdateBlock(ctx: PersonalContext): string {
  return [
    'LATEST WEIGHT UPDATE',
    `- Current weight: ${tokenOrFallback(ctx.wuCurrentKg, 'unknown')} kg`,
    `- Change since last weigh-in: ${tokenOrFallback(ctx.wuDeltaSinceLastKg, '0')} kg`,
    `- 30-day change: ${tokenOrFallback(ctx.wuDelta30dKg, '0')} kg`,
    `- Current week calories: ${tokenOrFallback(ctx.wuCurrentWeekCalories, '0')} kcal`,
    `- Most active week: ${tokenOrFallback(ctx.wuMostActiveWeek, 'n/a')} (${tokenOrFallback(ctx.wuMostActiveWeekCalories, '0')} kcal)`,
    `- Top exercises: ${tokenOrFallback(ctx.wuTopExercises, 'n/a')}`,
  ].join('\n');
}

function renderAnalysisBlock(ctx: PersonalContext): string {
  if (ctx.analysisAvailable !== '1') {
    return [
      'PROGRESS ANALYSIS',
      '- (not enough logged data yet — encourage the user to log workouts and weigh in so trends can be analyzed.)',
    ].join('\n');
  }
  return [
    'PROGRESS ANALYSIS (analyze this — do not just repeat the numbers)',
    `- Weight trend: ${tokenOrFallback(ctx.weightVelocityKgPerWeek, 'n/a')} (goal alignment: ${tokenOrFallback(ctx.weightGoalAlignment, 'n/a')})`,
    `- This week: ${tokenOrFallback(ctx.currentWeekWorkouts, '0')} workouts, ${tokenOrFallback(ctx.currentWeekMinutes, '0')} min, adherence ${tokenOrFallback(ctx.currentWeekAdherence, 'n/a')}`,
    `- Best week on record: ${tokenOrFallback(ctx.bestWeekSummary, 'n/a')}`,
    `- Muscle balance: ${tokenOrFallback(ctx.muscleBalanceNote, 'n/a')}`,
    `- Top exercise progress: ${tokenOrFallback(ctx.topExerciseProgress, 'n/a')}`,
    `- Plateau check: ${tokenOrFallback(ctx.stallNote, 'n/a')}`,
    `- App-suggested focus: ${tokenOrFallback(ctx.coachSuggestions, 'n/a')}`,
  ].join('\n');
}

function renderMemoryBlock(m: ChatMemoryDoc): string {
  const lines = ['CHAT MEMORY'];
  lines.push(`- Summary: ${m.summary?.trim() || '(none yet)'}`);
  if (m.lastGoal) lines.push(`- Last goal discussed: ${m.lastGoal}`);
  if (m.lastRecommendedWorkout) lines.push(`- Last recommended workout: ${m.lastRecommendedWorkout}`);
  if (m.dislikedExercises && m.dislikedExercises.length > 0) {
    lines.push(`- Disliked exercises (avoid): ${m.dislikedExercises.join(', ')}`);
  }
  if (m.preferredTone) lines.push(`- Preferred tone: ${m.preferredTone}`);
  return lines.join('\n');
}

function renderKnowledgeBlock(docs: KnowledgeDoc[]): string {
  if (docs.length === 0) return 'KNOWLEDGE BASE\n- (no matching entries — answer from your general knowledge but stay safe.)';
  const lines = ['KNOWLEDGE BASE (top retrieved entries — cite when relevant)'];
  docs.forEach((d, i) => {
    const excerpt = d.content.length > 350 ? d.content.slice(0, 350) + '…' : d.content;
    const safety = d.safetyNotes ? ` [safety: ${d.safetyNotes}]` : '';
    lines.push(`${i + 1}. [${d.title}] (${d.category ?? 'general'})${safety}`);
    lines.push(`   ${excerpt}`);
  });
  return lines.join('\n');
}

function renderHistoryBlock(history: ChatHistoryEntry[]): string {
  if (history.length === 0) return 'RECENT CONVERSATION\n- (none — first message of this session)';
  const lines = ['RECENT CONVERSATION (last 5 turns)'];
  for (const h of history.slice(-5)) {
    const role = h.from === 'user' ? 'user' : 'assistant';
    const text = h.text.length > 250 ? h.text.slice(0, 250) + '…' : h.text;
    lines.push(`${role}: ${text}`);
  }
  return lines.join('\n');
}

function renderSafetyBlock(safety: SafetyDecision): string {
  if (safety.level === 'none') return 'SAFETY LEVEL: none';
  return `SAFETY LEVEL: ${safety.level} — ${safety.reason ?? 'see system rules'}`;
}

export function buildGeminiPrompt(inputs: PromptInputs): {
  systemInstruction: string;
  userPrompt: string;
} {
  const userPrompt = [
    renderProfileBlock(inputs.personal),
    '',
    renderActivityBlock(inputs.personal),
    '',
    renderPlanBlock(inputs.personal),
    '',
    renderWeightUpdateBlock(inputs.personal),
    '',
    renderAnalysisBlock(inputs.personal),
    '',
    renderMemoryBlock(inputs.memory),
    '',
    `DETECTED INTENT: ${inputs.intent}`,
    renderSafetyBlock(inputs.safety),
    '',
    renderKnowledgeBlock(inputs.knowledge),
    '',
    renderHistoryBlock(inputs.history),
    '',
    `NEW USER MESSAGE: ${inputs.message}`,
    '',
    'Respond with the JSON object only.',
  ].join('\n');

  return { systemInstruction: SYSTEM_INSTRUCTION, userPrompt };
}
