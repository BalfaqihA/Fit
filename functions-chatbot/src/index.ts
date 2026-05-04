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

type IntentEntry = {
  tag: string;
  patterns: string[];
  responses: string[];
};

type ModelMeta = {
  vocab: string[];
  intents: string[];
  threshold: number;
  softThreshold?: number;
  hardThreshold?: number;
};

const MODEL_DIR = path.join(__dirname, '..', 'model');

const meta: ModelMeta = JSON.parse(
  fs.readFileSync(path.join(MODEL_DIR, 'vocab.json'), 'utf-8'),
);

// Tiered confidence thresholds. Read from intents.json (preferred), fall back
// to the legacy single threshold, then to sane defaults.
const HARD_THRESHOLD =
  (intentsData as { hardThreshold?: number }).hardThreshold ?? 0.7;
const SOFT_THRESHOLD =
  (intentsData as { softThreshold?: number }).softThreshold ?? 0.4;

const RESPONSES: Record<string, string[]> = Object.fromEntries(
  (intentsData.intents as IntentEntry[]).map((i) => [i.tag, i.responses]),
);

// Human-friendly labels for soft-clarify replies ("did you mean X or Y?").
const HUMAN_LABEL: Record<string, string> = {
  greeting: 'a quick hello',
  ask_plan_today: "today's plan",
  ask_workout_advice: 'training advice',
  nutrition_question: 'nutrition advice',
  motivation: 'motivation',
  rest_day_advice: 'rest day advice',
  injury_concern: 'an injury question',
  equipment_swap: 'an equipment swap',
  log_question: 'how to log a workout',
  progress_question: 'a progress check',
  goodbye: 'goodbye',
  thanks: 'thanks',
  confusion: 'a clarification',
  affirmation: 'a yes',
  negation: 'a no',
  app_help: 'help with the app',
  share_progress: 'sharing progress',
};

function humanLabel(tag: string): string {
  return HUMAN_LABEL[tag] ?? tag.replace(/_/g, ' ');
}

function pickResponse(tag: string): string {
  const pool =
    RESPONSES[tag] ??
    RESPONSES.unknown_fallback ?? ["I'm not sure I caught that."];
  return pool[Math.floor(Math.random() * pool.length)];
}

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

    const message = String(req.data?.message ?? '').trim();
    if (!message) {
      throw new HttpsError('invalid-argument', 'Empty message.');
    }
    if (message.length > 500) {
      throw new HttpsError('invalid-argument', 'Message too long.');
    }

    const previousIntent =
      typeof req.data?.previousIntent === 'string'
        ? req.data.previousIntent
        : null;
    const uid = req.auth.uid;

    // ---- 1. Rule-based safety overrides (bypass ML) ----
    const override = checkOverrides(message);
    if (override) {
      return {
        reply: override.reply,
        intent: override.intent,
        confidence: 1.0,
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

    // ---- 3. Context disambiguation for affirmation / negation ----
    let resolvedTag = topTag;
    if (
      (topTag === 'affirmation' || topTag === 'negation') &&
      previousIntent
    ) {
      const contextual = `${topTag}_after_${previousIntent}`;
      if (RESPONSES[contextual]) resolvedTag = contextual;
    }

    // ---- 4. Confidence tiers ----
    let intent = resolvedTag;
    let reply: string;

    if (topConf >= HARD_THRESHOLD) {
      reply = pickResponse(resolvedTag);
    } else if (topConf >= SOFT_THRESHOLD) {
      intent = 'soft_clarify';
      const a = humanLabel(meta.intents[top.idx]);
      const b = humanLabel(meta.intents[second.idx]);
      reply = `I'm not 100% sure — did you mean ${a} or ${b}?`;
    } else {
      intent = 'unknown_fallback';
      reply = pickResponse('unknown_fallback');
      // Fire-and-forget log so we can grow the dataset later.
      void logUnknown(uid, message, topTag, topConf);
    }

    const filledReply = await fillTemplate(reply, uid);

    return { reply: filledReply, intent, confidence: topConf };
  },
);
