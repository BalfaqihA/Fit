import { GoogleGenerativeAI } from '@google/generative-ai';
import { defineSecret } from 'firebase-functions/params';

import type { GeminiAnswer } from './types';

// The secret must be set via `firebase functions:secrets:set GEMINI_API_KEY`
// before the chatbot deploy. Exported so the `chat` callable in index.ts can
// declare it in its `secrets` option (required for v2 secret access).
export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const MODEL = 'gemini-2.5-flash';
const TEMPERATURE = 0.4;
const MAX_OUTPUT_TOKENS = 800;

/**
 * Thrown when Gemini cannot be reached or returns no text. The orchestrator
 * catches this and falls back to the template path so the user never sees a
 * raw 500.
 */
export class GeminiFailureError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'GeminiFailureError';
  }
}

export type GeminiRequest = {
  systemInstruction: string;
  userPrompt: string;
};

let cachedClient: GoogleGenerativeAI | null = null;
function client(): GoogleGenerativeAI {
  if (cachedClient) return cachedClient;
  const key = GEMINI_API_KEY.value();
  if (!key) {
    throw new GeminiFailureError('GEMINI_API_KEY secret not configured');
  }
  cachedClient = new GoogleGenerativeAI(key);
  return cachedClient;
}

async function callOnce(req: GeminiRequest): Promise<string> {
  const model = client().getGenerativeModel({
    model: MODEL,
    systemInstruction: req.systemInstruction,
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // Force JSON output. The validator still defensively parses, but this
      // dramatically lowers the malformed-JSON rate vs free-form prompting.
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(req.userPrompt);
  const text = result.response.text();
  if (!text || !text.trim()) {
    throw new GeminiFailureError('Gemini returned empty text');
  }
  return text;
}

/**
 * Call Gemini, retrying once on transient failure. Returns the raw JSON
 * string — `responseValidator.parseAndValidate()` is responsible for parsing.
 */
export async function callGemini(req: GeminiRequest): Promise<string> {
  try {
    return await callOnce(req);
  } catch (err) {
    if (isRetryable(err)) {
      try {
        return await callOnce(req);
      } catch (err2) {
        throw new GeminiFailureError('Gemini call failed after retry', err2);
      }
    }
    throw err instanceof GeminiFailureError
      ? err
      : new GeminiFailureError('Gemini call failed', err);
  }
}

function isRetryable(err: unknown): boolean {
  if (!err) return false;
  // Generative AI SDK surfaces transient errors as objects with a `status` or
  // a message containing the http code. Be defensive — anything 5xx or
  // network-shaped is worth one retry.
  const msg = (err as { message?: string }).message ?? String(err);
  return /\b(500|502|503|504|UNAVAILABLE|ECONNRESET|ETIMEDOUT|fetch failed)\b/i.test(
    msg,
  );
}

/** Type-only re-export so callers don't need to import from two files. */
export type { GeminiAnswer };
