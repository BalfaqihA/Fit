import { defineSecret } from 'firebase-functions/params';

import type { GeminiAnswer } from './types';

// The secret must be set via `firebase functions:secrets:set DEEPSEEK_API_KEY`
// before the chatbot deploy. Exported so the `chat` callable in index.ts can
// declare it in its `secrets` option (required for v2 secret access).
export const DEEPSEEK_API_KEY = defineSecret('DEEPSEEK_API_KEY');

// DeepSeek exposes an OpenAI-compatible REST API, so we call it directly with
// `fetch` (no SDK dependency). `deepseek-chat` is the non-thinking model —
// fast and cheap, which is what we want for short JSON answers.
// NOTE: the `deepseek-chat` alias is scheduled to deprecate 2026-07-24; if it
// stops working, switch MODEL to 'deepseek-v4-flash'.
const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const TEMPERATURE = 0.4;
const MAX_OUTPUT_TOKENS = 800;
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Thrown when DeepSeek cannot be reached or returns no text. The orchestrator
 * catches this and falls back to the template path so the user never sees a
 * raw 500.
 */
export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DeepSeekError';
  }
}

export type DeepSeekRequest = {
  systemInstruction: string;
  userPrompt: string;
};

async function callOnce(req: DeepSeekRequest): Promise<string> {
  const key = DEEPSEEK_API_KEY.value();
  if (!key) {
    throw new DeepSeekError('DEEPSEEK_API_KEY secret not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(DEEPSEEK_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: TEMPERATURE,
        max_tokens: MAX_OUTPUT_TOKENS,
        // Force JSON output. The prompt already instructs "Respond with the
        // JSON object only", which satisfies DeepSeek's requirement that the
        // word "json" appear in the input when json_object mode is enabled.
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: req.systemInstruction },
          { role: 'user', content: req.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      // Keep the status in the message so isRetryable() can spot 5xx/429.
      const detail = await res.text().catch(() => '');
      throw new DeepSeekError(
        `DeepSeek HTTP ${res.status} ${res.statusText} ${detail.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text.trim()) {
      throw new DeepSeekError('DeepSeek returned empty text');
    }
    return text;
  } catch (err) {
    // Already-classified failures (HTTP status / empty body) pass through with
    // their message intact; everything else (network, abort/timeout, JSON
    // parse) is wrapped so the cause is preserved for isRetryable().
    if (err instanceof DeepSeekError) throw err;
    throw new DeepSeekError('DeepSeek request failed', err);
  } finally {
    clearTimeout(timer);
  }
}

// Backoff before the single transient-failure retry. A short delay lets a
// momentary blip heal without blowing past the user's perceived response budget.
const RETRY_BACKOFF_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call DeepSeek, retrying once on transient failure with a short backoff.
 * Returns the raw JSON string — `responseValidator.parseAndValidate()` is
 * responsible for parsing.
 */
export async function callDeepSeek(req: DeepSeekRequest): Promise<string> {
  try {
    return await callOnce(req);
  } catch (err) {
    if (isRetryable(err)) {
      await sleep(RETRY_BACKOFF_MS);
      try {
        return await callOnce(req);
      } catch (err2) {
        throw new DeepSeekError('DeepSeek call failed after retry', err2);
      }
    }
    throw err instanceof DeepSeekError
      ? err
      : new DeepSeekError('DeepSeek call failed', err);
  }
}

function isRetryable(err: unknown): boolean {
  if (!err) return false;
  // Transient failures surface either as an HTTP status embedded in the
  // message (5xx / 429) or as a network-shaped cause on the wrapped error.
  // Be defensive — anything 5xx, rate-limit, or network-shaped is worth one retry.
  const direct = (err as { message?: string }).message ?? String(err);
  const cause = err instanceof DeepSeekError ? String(err.cause ?? '') : '';
  const hay = `${direct} ${cause}`;
  return /\b(429|500|502|503|504|UNAVAILABLE|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|abort|fetch failed)\b/i.test(
    hay,
  );
}

/** Type-only re-export so callers don't need to import from two files. */
export type { GeminiAnswer };
