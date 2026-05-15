import { checkOverrides } from '../overrides';
import { buildPersonalContext } from '../personalize';

import { checkAndIncrement } from './dailyQuota';
import { callGemini, GeminiFailureError } from './geminiClient';
import { appendMessage, getOrCreateActiveSession } from './chatHistoryService';
import { loadMemory, updateMemory } from './chatMemoryService';
import { mapToBroadIntent } from './intentMapper';
import { retrieveKnowledge } from './knowledgeRetriever';
import { buildGeminiPrompt } from './promptBuilder';
import { parseAndValidate, renderAnswerMarkdown } from './responseValidator';
import { blockReply, preGeminiSafetyCheck } from './safetyRules';
import {
  classifyMessage,
  runTemplatePipeline,
  type Classification,
} from './templateFallback';

import type {
  ChatHistoryEntry,
  ChatMessageDoc,
  KnowledgeDoc,
  OrchestratorResult,
  SafetyDecision,
} from './types';

// Orchestrator — the full chat pipeline. Called from `chat()` in index.ts
// once per user turn. Read top to bottom; the bullet numbers match the
// architecture diagram in the plan.

export type OrchestratorInputs = {
  uid: string;
  message: string;
  history: ChatHistoryEntry[];
  previousIntent: string | null;
  styleHint?: string;
};

const QUOTA_FALLBACK_SUGGESTION =
  "You've hit today's coaching limit — back tomorrow with personalized advice. Templated answers below for now.";

export async function handle(
  inputs: OrchestratorInputs,
): Promise<OrchestratorResult> {
  const { uid, message, history, previousIntent, styleHint } = inputs;

  // 1. Crisis bypass. checkOverrides handles self-harm, acute medical, etc.
  //    We MUST NOT call Gemini for these — vetted canned replies only.
  const override = checkOverrides(message);
  if (override) {
    return {
      reply: override.reply,
      intent: override.intent,
      confidence: 1.0,
      segments: { shortAnswer: override.reply },
    };
  }

  // 2. Classify with the existing tfjs model. We need this both for the
  //    Gemini prompt's broad intent and as input to the template fallback.
  let classification: Classification;
  try {
    classification = await classifyMessage(message);
  } catch (err) {
    console.warn('[chatbot] classifyMessage failed', err);
    classification = {
      topTag: 'general_chat',
      topConf: 0,
      secondTag: 'general_chat',
      secondConf: 0,
    };
  }
  const broadIntent = mapToBroadIntent(classification.topTag);

  // 3. Build personalization context (snapshot-backed).
  const ctx = await buildPersonalContext(uid);

  // 6 (early). Lower-severity safety check. If `block`, skip Gemini entirely
  // and return a safe templated message. Note `caution` still proceeds —
  // Gemini sees the warning in the prompt and adapts its answer.
  const safety: SafetyDecision = preGeminiSafetyCheck(message);
  if (safety.level === 'block') {
    const result: OrchestratorResult = {
      reply: blockReply(),
      intent: 'safety_block',
      confidence: 1.0,
      segments: { shortAnswer: blockReply() },
      safetyWarning: safety.reason,
    };
    await persistTurn(uid, message, result, classification, broadIntent, safety, []);
    return result;
  }

  // Fallback path: returns immediately if anything below blocks Gemini.
  // Memoized so we only build it when needed.
  let fallbackPromise: Promise<OrchestratorResult> | null = null;
  const runFallback = (
    note?: string,
  ): Promise<OrchestratorResult> => {
    if (!fallbackPromise) {
      fallbackPromise = runTemplatePipeline({
        uid,
        message,
        history,
        previousIntent,
        ctx,
        styleHint,
        classification,
      });
    }
    return note
      ? fallbackPromise.then((r) => ({
          ...r,
          reply: `${note}\n\n${r.reply}`,
          segments: {
            ...r.segments!,
            suggestion: note,
          },
        }))
      : fallbackPromise;
  };

  // 4 + 5. Load memory and retrieve knowledge in parallel — both are
  // independent reads of the same Firestore region.
  let memory;
  let knowledge: KnowledgeDoc[];
  try {
    [memory, knowledge] = await Promise.all([
      loadMemory(uid),
      retrieveKnowledge({
        message,
        intent: broadIntent,
        goal: ctx.goal,
        fitnessLevel: ctx.__fitnessLevel,
      }),
    ]);
  } catch (err) {
    console.warn('[chatbot] memory+knowledge fetch failed', err);
    memory = { userId: uid };
    knowledge = [];
  }

  // 7. Daily quota gate. checkAndIncrement is atomic — a failed Gemini call
  // after this point still costs a slot, but that's better than racing.
  const quota = await checkAndIncrement(uid).catch((err) => {
    console.warn('[chatbot] checkAndIncrement failed', err);
    return { allowed: true, countAfter: 0, date: '' };
  });
  if (!quota.allowed) {
    const result = await runFallback(QUOTA_FALLBACK_SUGGESTION);
    await persistTurn(uid, message, result, classification, broadIntent, safety, []);
    return result;
  }

  // 8 + 9. Build prompt, call Gemini, validate.
  const prompt = buildGeminiPrompt({
    message,
    personal: ctx,
    memory,
    knowledge,
    intent: broadIntent,
    safety,
    history,
  });

  let validated;
  try {
    const raw = await callGemini(prompt);
    validated = parseAndValidate(raw);
    if (!validated) {
      console.warn('[chatbot] Gemini response failed validation', { raw: raw.slice(0, 300) });
    }
  } catch (err) {
    if (err instanceof GeminiFailureError) {
      console.warn('[chatbot] Gemini call failed, falling back to template', err.message);
    } else {
      console.warn('[chatbot] Unexpected Gemini error', err);
    }
    validated = null;
  }

  if (!validated) {
    const result = await runFallback();
    await persistTurn(uid, message, result, classification, broadIntent, safety, []);
    return result;
  }

  const result: OrchestratorResult = {
    reply: renderAnswerMarkdown(validated),
    intent: broadIntent,
    confidence: validated.confidence,
    personalizedRecommendation: validated.personalizedRecommendation || undefined,
    reason: validated.reason || undefined,
    steps: validated.steps.length > 0 ? validated.steps : undefined,
    safetyWarning: validated.safetyWarning || undefined,
    suggestedActions: validated.suggestedActions.length > 0 ? validated.suggestedActions : undefined,
    followUpQuestion: validated.followUpQuestion || undefined,
    segments: {
      shortAnswer: validated.answer,
      explanation: validated.personalizedRecommendation || undefined,
      actionSteps: validated.steps.length > 0 ? validated.steps : undefined,
      suggestion: validated.reason || undefined,
    },
  };

  // 10 + 11 + 12. Persist + update memory + (quota was already incremented).
  const sourcesUsed = knowledge.map((k) => k.id);
  await persistTurn(uid, message, result, classification, broadIntent, safety, sourcesUsed);
  await updateMemory(uid, {
    lastGoal: ctx.goal,
    lastRecommendedWorkout:
      broadIntent === 'workout_plan' ? validated.answer.slice(0, 200) : undefined,
    commonQuestions: [message.slice(0, 120)],
  });

  return result;
}

/**
 * Append the user + assistant turn to chat_sessions and stamp the assistant
 * message id onto the result so the client can attach feedback. Best-effort:
 * if the session resolves but the message write fails, we still return the
 * result without ids.
 */
async function persistTurn(
  uid: string,
  userMessage: string,
  result: OrchestratorResult,
  classification: Classification,
  broadIntent: string,
  safety: SafetyDecision,
  sourcesUsed: string[],
): Promise<void> {
  let sessionId: string;
  try {
    sessionId = await getOrCreateActiveSession(uid);
  } catch (err) {
    console.warn('[chatbot] session resolve failed', err);
    return;
  }
  result.sessionId = sessionId;

  const userDoc: ChatMessageDoc = {
    role: 'user',
    text: userMessage,
    intent: classification.topTag,
  };
  const assistantDoc: ChatMessageDoc = {
    role: 'assistant',
    text: result.reply,
    intent: broadIntent,
    safetyLevel: safety.level,
    sourcesUsed,
  };
  await appendMessage(sessionId, userDoc);
  const assistantId = await appendMessage(sessionId, assistantDoc);
  if (assistantId) result.messageId = assistantId;
}
