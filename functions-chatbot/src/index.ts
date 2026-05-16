import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { GEMINI_API_KEY } from './chatbot/geminiClient';
import { handle as orchestrate } from './chatbot/orchestrator';
import { QUIZ_BY_ID } from './chatbot/templateFallback';
import {
  consumeRateLimit,
  QUIZ_ANSWER_LIMIT,
  SEND_CHAT_LIMIT,
} from './rate-limit';

import type { ChatHistoryEntry, OrchestratorResult } from './chatbot/types';

initializeApp();

// ---------- Quiz grading (unchanged — kept in index.ts because it's tied to
// the callable signature and doesn't benefit from the orchestrator pipeline)

type ResponseQuiz = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  xpReward: number;
  topic?: string;
};

const DAILY_QUIZ_XP_CAP = 100;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function gradeQuiz(
  uid: string,
  quiz: ResponseQuiz,
  selectedIndex: number,
  attemptId: string,
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
  const attemptRef = db.doc(`users/${uid}/quizAttempts/${attemptId}`);
  const xpEventRef = db.doc(`users/${uid}/xp_events/${attemptId}`);
  const today = todayKey();

  let award = 0;
  let capReached = false;
  await db.runTransaction(async (tx) => {
    const prior = await tx.get(attemptRef);
    if (prior.exists) {
      const priorData = prior.data() ?? {};
      award = Number(priorData.xpAwarded ?? 0);
      capReached = Boolean(priorData.capReached);
      return;
    }

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

    tx.set(attemptRef, {
      quizId: quiz.id,
      selectedIndex,
      xpAwarded: grant,
      capReached: grant < quiz.xpReward,
      createdAt: FieldValue.serverTimestamp(),
    });

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

// ---------- Request shape ----------

type QuizAnswerPayload = {
  id: string;
  selectedIndex: number;
  attemptId: string;
};

const QUIZ_ID_MAX_LEN = 64;
const ATTEMPT_ID_MAX_LEN = 128;
const ATTEMPT_ID_RE = /^[A-Za-z0-9_-]+$/;

const ALLOWED_ORIGINS = [
  'https://fitness-874c3.web.app',
  'https://fitness-874c3.firebaseapp.com',
];

export const chat = onCall(
  {
    cors: ALLOWED_ORIGINS,
    region: 'us-central1',
    // Declare the Gemini secret so it's mounted into the runtime env. The
    // wrapper in `chatbot/geminiClient.ts` reads it via `defineSecret().value()`.
    secrets: [GEMINI_API_KEY],
  },
  async (req): Promise<OrchestratorResult & {
    xpAwarded?: number;
    capReached?: boolean;
  }> => {
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
      await consumeRateLimit(uid, QUIZ_ANSWER_LIMIT);
      const { id, selectedIndex, attemptId } = data.quizAnswer;
      if (typeof id !== 'string' || id.length === 0 || id.length > QUIZ_ID_MAX_LEN) {
        throw new HttpsError('invalid-argument', 'Invalid quiz id.');
      }
      if (
        typeof attemptId !== 'string' ||
        attemptId.length === 0 ||
        attemptId.length > ATTEMPT_ID_MAX_LEN ||
        !ATTEMPT_ID_RE.test(attemptId)
      ) {
        throw new HttpsError('invalid-argument', 'Invalid attempt id.');
      }
      const quiz = QUIZ_BY_ID[id];
      if (!quiz) {
        throw new HttpsError('not-found', `Unknown quiz id: ${id}`);
      }
      if (
        typeof selectedIndex !== 'number' ||
        !Number.isInteger(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= quiz.options.length
      ) {
        throw new HttpsError('invalid-argument', 'Invalid quiz selection.');
      }
      try {
        const result = await gradeQuiz(uid, quiz, selectedIndex, attemptId);
        return {
          reply: result.reply,
          intent: result.correct ? 'quiz_correct' : 'quiz_incorrect',
          confidence: 1.0,
          segments: { shortAnswer: result.reply },
          xpAwarded: result.xpAwarded,
          capReached: result.capReached,
        };
      } catch (err) {
        console.error('[chatbot] gradeQuiz failed:', err);
        throw new HttpsError(
          'internal',
          "Couldn't grade that quiz. Please try again.",
        );
      }
    }

    // ---- Per-minute rate limit (anti-abuse) ----
    await consumeRateLimit(uid, SEND_CHAT_LIMIT);

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

    return orchestrate({ uid, message, history, previousIntent, styleHint });
  },
);

// ---------- Admin section ----------
export * from './adminBootstrap';
export * from './admin';
