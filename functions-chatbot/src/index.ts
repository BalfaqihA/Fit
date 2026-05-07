import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as fs from 'fs';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs';

import intentsData from './intents.json';
import { checkOverrides } from './overrides';
import { fillTemplate } from './personalize';
import { vectorize } from './preprocess';

initializeApp();

// ---------- Types ----------

type ResponseAction = {
  label: string;
  type: 'navigate' | 'external';
  route?: string;
  url?: string;
};

type ResponseQuiz = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
  topic?: string;
};

type StructuredResponse = {
  style?: 'beginner' | 'advanced' | 'motivational' | 'warning' | 'step';
  shortAnswer: string;
  explanation?: string;
  actionSteps?: string[];
  suggestion?: string;
  followUpQuestion?: string;
  action?: ResponseAction;
  quiz?: ResponseQuiz;
};

type ResponseEntry = string | StructuredResponse;

type IntentEntry = {
  tag: string;
  patterns: string[];
  responses: ResponseEntry[];
};

type ModelMeta = {
  vocab: string[];
  intents: string[];
  threshold: number;
  softThreshold?: number;
  hardThreshold?: number;
};

type StyleRouting = Record<string, string>;

// ---------- Boot-time data ----------

const MODEL_DIR = path.join(__dirname, '..', 'model');

const meta: ModelMeta = JSON.parse(
  fs.readFileSync(path.join(MODEL_DIR, 'vocab.json'), 'utf-8'),
);

const HARD_THRESHOLD =
  (intentsData as { hardThreshold?: number }).hardThreshold ?? 0.65;
const SOFT_THRESHOLD =
  (intentsData as { softThreshold?: number }).softThreshold ?? 0.4;
const STYLE_ROUTING: StyleRouting =
  (intentsData as { styleRouting?: StyleRouting }).styleRouting ?? {};

const RESPONSES: Record<string, ResponseEntry[]> = Object.fromEntries(
  (intentsData.intents as IntentEntry[]).map((i) => [i.tag, i.responses]),
);

// Build a global quiz lookup so we can grade any quiz id in O(1).
const QUIZ_BY_ID: Record<string, ResponseQuiz> = {};
for (const intent of intentsData.intents as IntentEntry[]) {
  for (const r of intent.responses) {
    if (typeof r !== 'string' && r.quiz) {
      QUIZ_BY_ID[r.quiz.id] = r.quiz;
    }
  }
}

const HUMAN_LABEL: Record<string, string> = {
  greeting: 'a quick hello',
  ask_plan_today: "today's plan",
  ask_workout_advice: 'training advice',
  nutrition_question: 'nutrition advice',
  nutrition_macros: 'macros',
  motivation: 'motivation',
  rest_day_advice: 'rest day advice',
  injury_concern: 'an injury question',
  equipment_swap: 'an equipment swap',
  swap_exercise: 'an exercise swap',
  log_question: 'how to log a workout',
  progress_question: 'a progress check',
  goodbye: 'goodbye',
  thanks: 'thanks',
  confusion: 'a clarification',
  affirmation: 'a yes',
  negation: 'a no',
  app_help: 'help with the app',
  app_navigation: 'opening a screen',
  share_progress: 'sharing progress',
  ask_set_rep_scheme: 'sets and reps',
  form_check: 'form tips',
  hydration: 'hydration',
  sleep_recovery: 'sleep and recovery',
  progression_request: 'making it harder/easier',
  quiz_request: 'a quiz',
};

function humanLabel(tag: string): string {
  return HUMAN_LABEL[tag] ?? tag.replace(/_/g, ' ');
}

// ---------- Response selection ----------

function normalizeEntry(entry: ResponseEntry): StructuredResponse {
  if (typeof entry === 'string') return { shortAnswer: entry };
  return entry;
}

function styleFor(
  fitnessLevel: string | undefined,
  hint: string | undefined,
): string | undefined {
  if (hint) return hint;
  if (fitnessLevel && STYLE_ROUTING[fitnessLevel]) {
    return STYLE_ROUTING[fitnessLevel];
  }
  return undefined;
}

function pickResponse(
  tag: string,
  preferredStyle: string | undefined,
): StructuredResponse {
  const pool =
    RESPONSES[tag] ??
    RESPONSES.unknown_fallback ?? ["I'm not sure I caught that."];

  let candidates = pool.map(normalizeEntry);
  if (preferredStyle) {
    const filtered = candidates.filter((c) => c.style === preferredStyle);
    if (filtered.length > 0) candidates = filtered;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ---------- Markdown rendering ----------

function renderMarkdown(seg: StructuredResponse): string {
  const parts: string[] = [seg.shortAnswer];
  if (seg.explanation) parts.push(seg.explanation);
  if (seg.actionSteps && seg.actionSteps.length > 0) {
    const numbered = seg.actionSteps
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');
    parts.push(`**Steps**\n${numbered}`);
  }
  if (seg.suggestion) parts.push(`_${seg.suggestion}_`);
  return parts.join('\n\n');
}

async function renderSegment(
  seg: StructuredResponse,
  uid: string,
): Promise<{
  reply: string;
  segments: {
    shortAnswer: string;
    explanation?: string;
    actionSteps?: string[];
    suggestion?: string;
  };
  followUpQuestion?: string;
  action?: ResponseAction;
  quiz?: ResponseQuiz;
}> {
  const filledShort = await fillTemplate(seg.shortAnswer, uid);
  const filledExplanation = seg.explanation
    ? await fillTemplate(seg.explanation, uid)
    : undefined;
  const filledSteps = seg.actionSteps
    ? await Promise.all(seg.actionSteps.map((s) => fillTemplate(s, uid)))
    : undefined;
  const filledSuggestion = seg.suggestion
    ? await fillTemplate(seg.suggestion, uid)
    : undefined;
  const filledFollowUp = seg.followUpQuestion
    ? await fillTemplate(seg.followUpQuestion, uid)
    : undefined;

  const filledSeg: StructuredResponse = {
    ...seg,
    shortAnswer: filledShort,
    explanation: filledExplanation,
    actionSteps: filledSteps,
    suggestion: filledSuggestion,
  };

  return {
    reply: renderMarkdown(filledSeg),
    segments: {
      shortAnswer: filledShort,
      explanation: filledExplanation,
      actionSteps: filledSteps,
      suggestion: filledSuggestion,
    },
    followUpQuestion: filledFollowUp,
    action: seg.action,
    quiz: seg.quiz
      ? {
          id: seg.quiz.id,
          question: seg.quiz.question,
          options: seg.quiz.options,
          correctIndex: seg.quiz.correctIndex,
          explanation: seg.quiz.explanation,
          xpReward: seg.quiz.xpReward,
          topic: seg.quiz.topic,
        }
      : undefined,
  };
}

// ---------- Memory rules ----------

const PROGRESSION_RE = /\bmake it (harder|easier|tougher|simpler)\b/i;
const ANOTHER_QUIZ_RE = /\b(another one|one more|next( question)?|another quiz)\b/i;

function applyMemoryRules(
  message: string,
  topTag: string,
  previousIntent: string | null,
  history: ChatHistoryEntry[],
): string | null {
  if (PROGRESSION_RE.test(message)) {
    if (
      previousIntent === 'ask_plan_today' ||
      previousIntent === 'ask_workout_advice' ||
      previousIntent === 'progression_request'
    ) {
      return 'progression_request';
    }
  }
  if (ANOTHER_QUIZ_RE.test(message)) {
    const lastBotIntent =
      [...history].reverse().find((h) => h.from === 'bot')?.intent ?? null;
    if (lastBotIntent === 'quiz_request' || previousIntent === 'quiz_request') {
      return 'quiz_request';
    }
  }
  return null;
}

// ---------- Quiz grading ----------

async function loadFitnessLevel(uid: string): Promise<string | undefined> {
  try {
    const snap = await getFirestore().doc(`users/${uid}`).get();
    const lvl = (snap.data()?.fitnessLevel as string | undefined) ?? undefined;
    return lvl;
  } catch {
    return undefined;
  }
}

const DAILY_QUIZ_XP_CAP = 100;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function gradeQuiz(
  uid: string,
  quiz: ResponseQuiz,
  selectedIndex: number,
): Promise<{
  reply: string;
  xpAwarded: number;
  capReached: boolean;
  correct: boolean;
}> {
  const correct = selectedIndex === quiz.correctIndex;
  const correctLabel = quiz.options[quiz.correctIndex] ?? '';

  if (!correct) {
    return {
      reply: `**Not quite.** The answer was **${correctLabel}**.\n\n${quiz.explanation}`,
      xpAwarded: 0,
      capReached: false,
      correct: false,
    };
  }

  const db = getFirestore();
  const userRef = db.doc(`users/${uid}`);
  const xpEventRef = db.collection(`users/${uid}/xp_events`).doc();
  const today = todayKey();

  // Atomic check-then-award via transaction.
  let award = 0;
  let capReached = false;
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.data() ?? {};
      const stats = (data.stats ?? {}) as {
        chatQuizXpToday?: number;
        chatQuizXpDate?: string;
      };
      const sameDay = stats.chatQuizXpDate === today;
      const todaySoFar = sameDay ? Number(stats.chatQuizXpToday ?? 0) : 0;
      const remaining = Math.max(0, DAILY_QUIZ_XP_CAP - todaySoFar);
      const grant = Math.min(quiz.xpReward, remaining);

      if (grant <= 0) {
        capReached = true;
        return;
      }

      tx.set(
        userRef,
        {
          stats: {
            totalXp: FieldValue.increment(grant),
            chatQuizXpToday: todaySoFar + grant,
            chatQuizXpDate: today,
          },
        },
        { merge: true },
      );
      tx.set(xpEventRef, {
        source: 'chat_quiz',
        quizId: quiz.id,
        topic: quiz.topic ?? null,
        xp: grant,
        createdAt: FieldValue.serverTimestamp(),
      });
      award = grant;
      capReached = grant < quiz.xpReward;
    });
  } catch (err) {
    console.warn('[chatbot] gradeQuiz transaction failed:', err);
  }

  let reply = `✅ **Correct!**`;
  if (award > 0) {
    reply += ` +${award} XP`;
  }
  reply += `\n\n${quiz.explanation}`;
  if (capReached) {
    reply += `\n\n_(daily quiz XP cap reached — try again tomorrow!)_`;
  }
  return { reply, xpAwarded: award, capReached, correct: true };
}

// ---------- Model loading ----------

async function loadModelFromDir(dir: string): Promise<tf.LayersModel> {
  const modelJson = JSON.parse(
    fs.readFileSync(path.join(dir, 'model.json'), 'utf-8'),
  );
  const weightsBuffer = fs.readFileSync(path.join(dir, 'weights.bin'));
  const weightData = weightsBuffer.buffer.slice(
    weightsBuffer.byteOffset,
    weightsBuffer.byteOffset + weightsBuffer.byteLength,
  );
  const handler = tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData,
  });
  return tf.loadLayersModel(handler);
}

let modelPromise: Promise<tf.LayersModel> | null = null;
function getModel(): Promise<tf.LayersModel> {
  if (!modelPromise) modelPromise = loadModelFromDir(MODEL_DIR);
  return modelPromise;
}

async function logUnknown(
  uid: string,
  message: string,
  predictedIntent: string,
  confidence: number,
): Promise<void> {
  try {
    await getFirestore()
      .collection(`users/${uid}/chat_unknowns`)
      .add({
        message,
        predictedIntent,
        confidence,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    console.warn('[chatbot] logUnknown failed:', err);
  }
}

// ---------- Request shape ----------

type ChatHistoryEntry = {
  from: 'user' | 'bot';
  text: string;
  intent?: string;
};

type QuizAnswerPayload = {
  id: string;
  selectedIndex: number;
};

const ALLOWED_ORIGINS = [
  'https://fitness-874c3.web.app',
  'https://fitness-874c3.firebaseapp.com',
];

export const chat = onCall(
  { cors: ALLOWED_ORIGINS, region: 'us-central1' },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    const uid = req.auth.uid;
    const data = (req.data ?? {}) as {
      message?: string;
      previousIntent?: string;
      history?: ChatHistoryEntry[];
      styleHint?: string;
      quizAnswer?: QuizAnswerPayload;
    };

    // ---- 0. Quiz answer short-circuit ----
    if (data.quizAnswer && typeof data.quizAnswer === 'object') {
      const { id, selectedIndex } = data.quizAnswer;
      const quiz = QUIZ_BY_ID[id];
      if (!quiz) {
        throw new HttpsError('not-found', `Unknown quiz id: ${id}`);
      }
      if (
        typeof selectedIndex !== 'number' ||
        selectedIndex < 0 ||
        selectedIndex >= quiz.options.length
      ) {
        throw new HttpsError('invalid-argument', 'Invalid quiz selection.');
      }
      const result = await gradeQuiz(uid, quiz, selectedIndex);
      return {
        reply: result.reply,
        intent: result.correct ? 'quiz_correct' : 'quiz_incorrect',
        confidence: 1.0,
        segments: { shortAnswer: result.reply },
        xpAwarded: result.xpAwarded,
        capReached: result.capReached,
      };
    }

    const message = String(data.message ?? '').trim();
    if (!message) {
      throw new HttpsError('invalid-argument', 'Empty message.');
    }
    if (message.length > 500) {
      throw new HttpsError('invalid-argument', 'Message too long.');
    }

    const previousIntent =
      typeof data.previousIntent === 'string' ? data.previousIntent : null;
    const history: ChatHistoryEntry[] = Array.isArray(data.history)
      ? data.history.slice(-5)
      : [];
    const styleHint =
      typeof data.styleHint === 'string' ? data.styleHint : undefined;

    // ---- 1. Rule-based safety overrides (bypass ML) ----
    const override = checkOverrides(message);
    if (override) {
      return {
        reply: override.reply,
        intent: override.intent,
        confidence: 1.0,
        segments: { shortAnswer: override.reply },
      };
    }

    // ---- 2. Run model -> top-2 predictions ----
    const model = await getModel();
    const x = tf.tensor2d([vectorize(message, meta.vocab)]);
    const out = model.predict(x) as tf.Tensor;
    const probs = await out.data();
    x.dispose();
    out.dispose();

    const ranked = Array.from(probs)
      .map((p, idx) => ({ idx, p }))
      .sort((a, b) => b.p - a.p);
    const top = ranked[0];
    const second = ranked[1];
    const topTag = meta.intents[top.idx];
    const topConf = top.p;

    // ---- 3a. Conversation memory rules (override ML when applicable) ----
    const memoryTag = applyMemoryRules(message, topTag, previousIntent, history);

    // ---- 3b. Context disambiguation for affirmation / negation ----
    let resolvedTag = memoryTag ?? topTag;
    if (
      !memoryTag &&
      (topTag === 'affirmation' || topTag === 'negation') &&
      previousIntent
    ) {
      const contextual = `${topTag}_after_${previousIntent}`;
      if (RESPONSES[contextual]) resolvedTag = contextual;
    }

    // ---- 4. Confidence tiers ----
    let intent = resolvedTag;
    let chosenSeg: StructuredResponse;

    const fitnessLevel = await loadFitnessLevel(uid);
    const preferredStyle = styleFor(fitnessLevel, styleHint);

    if (memoryTag || topConf >= HARD_THRESHOLD) {
      chosenSeg = pickResponse(resolvedTag, preferredStyle);
    } else if (topConf >= SOFT_THRESHOLD) {
      intent = 'soft_clarify';
      const a = humanLabel(meta.intents[top.idx]);
      const b = humanLabel(meta.intents[second.idx]);
      chosenSeg = {
        shortAnswer: `I'm not 100% sure — did you mean **${a}** or **${b}**?`,
        suggestion: 'Reply with the topic or rephrase.',
      };
    } else {
      intent = 'unknown_fallback';
      chosenSeg = pickResponse('unknown_fallback', preferredStyle);
      void logUnknown(uid, message, topTag, topConf);
    }

    const rendered = await renderSegment(chosenSeg, uid);

    return {
      reply: rendered.reply,
      intent,
      confidence: topConf,
      segments: rendered.segments,
      action: rendered.action,
      followUpQuestion: rendered.followUpQuestion,
      quiz: rendered.quiz
        ? {
            id: rendered.quiz.id,
            question: rendered.quiz.question,
            options: rendered.quiz.options,
            xpReward: rendered.quiz.xpReward,
          }
        : undefined,
    };
  },
);
