import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs';

import intentsData from '../intents.json';
import {
  fillTemplateWithContext,
  type PersonalContext,
} from '../personalize';
import { vectorize } from '../preprocess';

import type {
  ChatHistoryEntry,
  OrchestratorResult,
} from './types';

// This module is the template-based fallback that wraps the original
// 43-intent tfjs classifier. The orchestrator delegates to it whenever
// Gemini can't be used (quota exceeded, API failure, malformed response).
// The previous monolithic logic from index.ts is preserved here essentially
// unchanged — extraction only, no behavior changes.

// ---------- Boot-time data ----------

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

// Resolve the model dir whether we're running from `lib/chatbot/` (compiled)
// or `src/chatbot/` (ts-node).
function resolveModelDir(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'model'),
    path.join(__dirname, '..', 'model'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'vocab.json'))) return c;
  }
  return candidates[0];
}

const MODEL_DIR = resolveModelDir();

const meta: ModelMeta = JSON.parse(
  fs.readFileSync(path.join(MODEL_DIR, 'vocab.json'), 'utf-8'),
);

export const HARD_THRESHOLD =
  (intentsData as { hardThreshold?: number }).hardThreshold ?? 0.65;
export const SOFT_THRESHOLD =
  (intentsData as { softThreshold?: number }).softThreshold ?? 0.4;
const STYLE_ROUTING: StyleRouting =
  (intentsData as { styleRouting?: StyleRouting }).styleRouting ?? {};

const RESPONSES: Record<string, ResponseEntry[]> = Object.fromEntries(
  (intentsData.intents as IntentEntry[]).map((i) => [i.tag, i.responses]),
);

// Build a global quiz lookup so we can grade any quiz id in O(1).
export const QUIZ_BY_ID: Record<string, ResponseQuiz> = {};
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
  exercise_squat: 'squats',
  exercise_deadlift: 'deadlifts',
  exercise_bench_press: 'the bench press',
  exercise_pullup: 'pull-ups',
  cardio_advice: 'cardio',
  weight_loss_tips: 'fat loss',
  muscle_gain_tips: 'muscle gain',
  supplement_question: 'supplements',
  consult_me: 'a personal consultation',
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

function renderMarkdown(seg: StructuredResponse): string {
  const parts: string[] = [seg.shortAnswer];
  if (seg.explanation) parts.push(seg.explanation);
  if (seg.actionSteps && seg.actionSteps.length > 0) {
    const numbered = seg.actionSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');
    parts.push(`**Steps**\n${numbered}`);
  }
  if (seg.suggestion) parts.push(`_${seg.suggestion}_`);
  return parts.join('\n\n');
}

function renderSegment(
  seg: StructuredResponse,
  ctx: PersonalContext,
): Pick<OrchestratorResult, 'reply' | 'segments' | 'followUpQuestion' | 'action' | 'quiz'> {
  const filledShort = fillTemplateWithContext(seg.shortAnswer, ctx);
  const filledExplanation = seg.explanation
    ? fillTemplateWithContext(seg.explanation, ctx)
    : undefined;
  const filledSteps = seg.actionSteps
    ? seg.actionSteps.map((s) => fillTemplateWithContext(s, ctx))
    : undefined;
  const filledSuggestion = seg.suggestion
    ? fillTemplateWithContext(seg.suggestion, ctx)
    : undefined;
  const filledFollowUp = seg.followUpQuestion
    ? fillTemplateWithContext(seg.followUpQuestion, ctx)
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
          xpReward: seg.quiz.xpReward,
        }
      : undefined,
  };
}

// ---------- Memory rules ----------

const PROGRESSION_RE = /\bmake it (harder|easier|tougher|simpler)\b/i;
const ANOTHER_QUIZ_RE = /\b(another one|one more|next( question)?|another quiz)\b/i;

function applyMemoryRules(
  message: string,
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

// ---------- Model loading & classification ----------

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

export type Classification = {
  topTag: string;
  topConf: number;
  secondTag: string;
  secondConf: number;
};

export async function classifyMessage(message: string): Promise<Classification> {
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
  return {
    topTag: meta.intents[top.idx],
    topConf: top.p,
    secondTag: meta.intents[second.idx],
    secondConf: second.p,
  };
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

// ---------- Public entry point ----------

export type TemplateInputs = {
  uid: string;
  message: string;
  history: ChatHistoryEntry[];
  previousIntent: string | null;
  ctx: PersonalContext;
  styleHint?: string;
  classification: Classification;
};

/**
 * Run the existing template pipeline end-to-end. Used as a fallback when
 * Gemini cannot or shouldn't be called, and also as the source of the
 * "structured response" the client renders.
 */
export async function runTemplatePipeline(
  inputs: TemplateInputs,
): Promise<OrchestratorResult> {
  const { uid, message, history, previousIntent, ctx, styleHint, classification } = inputs;

  // Memory rules first (they override the ML decision when applicable).
  const memoryTag = applyMemoryRules(message, previousIntent, history);

  let resolvedTag = memoryTag ?? classification.topTag;
  if (
    !memoryTag &&
    (classification.topTag === 'affirmation' || classification.topTag === 'negation') &&
    previousIntent
  ) {
    const contextual = `${classification.topTag}_after_${previousIntent}`;
    if (RESPONSES[contextual]) resolvedTag = contextual;
  }

  const preferredStyle = styleFor(ctx.__fitnessLevel, styleHint);

  let intent = resolvedTag;
  let chosenSeg: StructuredResponse;

  if (memoryTag || classification.topConf >= HARD_THRESHOLD) {
    chosenSeg = pickResponse(resolvedTag, preferredStyle);
  } else if (classification.topConf >= SOFT_THRESHOLD) {
    intent = 'soft_clarify';
    const a = humanLabel(classification.topTag);
    const b = humanLabel(classification.secondTag);
    chosenSeg = {
      shortAnswer: `I'm not 100% sure — did you mean **${a}** or **${b}**?`,
      suggestion: 'Reply with the topic or rephrase.',
    };
  } else {
    intent = 'unknown_fallback';
    chosenSeg = pickResponse('unknown_fallback', preferredStyle);
    void logUnknown(uid, message, classification.topTag, classification.topConf);
  }

  const rendered = renderSegment(chosenSeg, ctx);

  return {
    reply: rendered.reply,
    intent,
    confidence: classification.topConf,
    segments: rendered.segments,
    followUpQuestion: rendered.followUpQuestion,
    action: rendered.action,
    quiz: rendered.quiz,
  };
}
