import type { SafetyDecision } from './types';

// Lower-severity safety classifier that runs AFTER `overrides.ts` (which
// handles crisis-level messages and bypasses Gemini entirely). This module
// either:
//   - flags `caution`: still call Gemini, but include a warning in the prompt
//     so the model adapts the advice and surfaces a safetyWarning to the user
//   - flags `block`: skip Gemini, return a safe canned reply
//
// Keep the patterns conservative — false positives turn into nag-warnings on
// innocent questions.

type Rule = {
  pattern: RegExp;
  level: 'caution' | 'block';
  reason: string;
};

const RULES: Rule[] = [
  // Mild/persistent pain — answer, but warn and steer to alternatives.
  {
    pattern: /\b(knee|lower back|shoulder|elbow|wrist|ankle|hip)\s+(pain|hurt|hurts|sore|achy|aching)\b/i,
    level: 'caution',
    reason: 'user reports localized pain — avoid loading that joint and recommend professional check if it persists',
  },
  {
    pattern: /\b(my\s+(back|knee|shoulder|hip)\s+(hurts|aches|is sore))\b/i,
    level: 'caution',
    reason: 'user reports localized pain — recommend low-impact alternatives',
  },

  // Extreme dieting / very low calorie — block (we don't want to coach this).
  {
    pattern: /\b(eat\s+(only|just)?\s*(\d{1,3})\s*(calories|cal)\b)/i,
    level: 'block',
    reason: 'extreme calorie-restriction prompt',
  },
  {
    pattern: /\b(starve|starving myself|water fast for|fast for \d+ days|stop eating)\b/i,
    level: 'block',
    reason: 'extreme dieting / fasting',
  },

  // Unsafe weight-loss rate.
  {
    pattern: /\blose\s+(\d{1,2})\s*(kg|kilos|pounds|lbs)\s+in\s+(\d+)?\s*(day|week|weeks)\b/i,
    level: 'caution',
    reason: 'user requested rapid weight loss — sustainable rate is ~0.5–1kg/week, anything faster risks muscle loss',
  },

  // Medical / diagnosis questions.
  {
    pattern: /\b(do i have|am i\s+(diabetic|anemic|deficient|injured)|diagnose|is this an injury)\b/i,
    level: 'caution',
    reason: 'user asking for diagnosis — decline diagnosis but suggest consulting a doctor',
  },
  {
    pattern: /\b(blood pressure|heart condition|diabetes|asthma|surgery)\b/i,
    level: 'caution',
    reason: 'user mentioned a medical condition — recommend medical clearance for any training plan',
  },

  // Overtraining flags.
  {
    pattern: /\b(train(ing)? every day|workout (twice|3 times) a day|no rest days?|7 days a week)\b/i,
    level: 'caution',
    reason: 'user describes potential overtraining — emphasize recovery and deload weeks',
  },

  // Supplement abuse signals.
  {
    pattern: /\b(double the dose|more (creatine|protein) than|max(imum)? dose|overdose)\b/i,
    level: 'caution',
    reason: 'user asking about over-dosing supplements — give the safe range only',
  },
];

const BLOCK_REPLY =
  "I can't give advice that could put your health at risk. Please talk to a registered dietitian or doctor — sustainable progress always beats a shortcut.";

export function preGeminiSafetyCheck(message: string): SafetyDecision {
  for (const rule of RULES) {
    if (rule.pattern.test(message)) {
      return { level: rule.level, reason: rule.reason };
    }
  }
  return { level: 'none' };
}

export function blockReply(): string {
  return BLOCK_REPLY;
}
