import type { GeminiAnswer } from './types';

// Defensive parse of whatever Gemini hands back. With responseMimeType=json
// the model almost always returns valid JSON, but we still:
//   1. strip stray markdown fences if any leaked through
//   2. parse — fail soft (return null) on syntax error
//   3. coerce missing fields to sensible defaults
//   4. cap lengths so a misbehaving model can't blow up the UI

const MAX_ANSWER_LEN = 600;
const MAX_FIELD_LEN = 1200;
const MAX_STEPS = 8;
const MAX_ACTIONS = 6;

function stripFences(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }
  return s.trim();
}

function asString(v: unknown, max: number = MAX_FIELD_LEN): string {
  if (typeof v !== 'string') return '';
  return v.length > max ? v.slice(0, max) : v;
}

function asStringArray(v: unknown, maxCount: number, maxItemLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    out.push(trimmed.length > maxItemLen ? trimmed.slice(0, maxItemLen) : trimmed);
    if (out.length >= maxCount) break;
  }
  return out;
}

function asNumber(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

export function parseAndValidate(raw: string): GeminiAnswer | null {
  if (!raw || !raw.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;

  const answer = asString(obj.answer, MAX_ANSWER_LEN);
  if (!answer) return null; // answer is the one non-negotiable field

  return {
    answer,
    personalizedRecommendation: asString(obj.personalizedRecommendation),
    reason: asString(obj.reason),
    steps: asStringArray(obj.steps, MAX_STEPS, 300),
    safetyWarning: asString(obj.safetyWarning, 400),
    followUpQuestion: asString(obj.followUpQuestion, 200),
    suggestedActions: asStringArray(obj.suggestedActions, MAX_ACTIONS, 80),
    confidence: asNumber(obj.confidence, 0.5),
  };
}

/**
 * Render the validated answer to a markdown string for the legacy `reply`
 * field. The client also receives the structured pieces directly, but this
 * keeps the old contract working for any caller that only reads `reply`.
 */
export function renderAnswerMarkdown(a: GeminiAnswer): string {
  const parts: string[] = [a.answer];
  if (a.personalizedRecommendation) {
    parts.push(a.personalizedRecommendation);
  }
  if (a.reason) parts.push(`_${a.reason}_`);
  if (a.steps.length > 0) {
    parts.push(
      `**Steps**\n${a.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    );
  }
  if (a.safetyWarning) parts.push(`⚠️ **Heads up:** ${a.safetyWarning}`);
  return parts.join('\n\n');
}
