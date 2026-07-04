import natural from 'natural';

import intentsData from './intents.json';
import { SYNONYMS } from './preprocess';

// Fuzzy spelling correction toward the chatbot's own domain vocabulary, so the
// tf.js classifier and the deterministic domain guards can see through typos
// ("wrkout" -> "workout", "exerices" -> "exercise").
//
// SAFETY (per the LLM-council review): a corrector that silently rewrites input
// can make the bot CONFIDENTLY WRONG, which is worse than a missed correction.
// Guards:
//   - only the text we CLASSIFY / domain-check is corrected — never the text
//     sent to the LLM (it handles typos itself) and never what we persist.
//   - short words are left alone (a 3-letter typo is too ambiguous).
//   - a never-correct blocklist for short words a fuzzy match confuses
//     (diet/died, lean/learn, burn/born, rep/rip, set/sit) — both as a source
//     token AND as a candidate target.
//   - it's wired behind a flag (CORRECTOR_ENABLED) and eval-gated: kept only if
//     `npm run eval` shows a misspelled-accuracy lift with no clean regression.

const jaroWinkler = natural.JaroWinklerDistance;
const levenshtein = natural.LevenshteinDistance;

const JW_MIN = 0.88;
const MIN_LEN = 4;

// Length-scaled edit-distance cap: stricter for short words (where a small edit
// changes the meaning), looser for long words (where transposition typos add up
// but the word is still unambiguous).
function maxLev(len: number): number {
  if (len <= 4) return 1;
  if (len <= 7) return 2;
  return 3;
}

const BLOCKLIST = new Set([
  'diet', 'died', 'lean', 'learn', 'burn', 'born', 'rep', 'rip', 'reps',
  'set', 'sit', 'fit', 'fat', 'run', 'ran', 'sun', 'son', 'win', 'won',
  'tan', 'ten', 'bar', 'far', 'cut', 'gut',
]);

function buildVocab(): string[] {
  const vocab = new Set<string>();
  for (const k of Object.keys(SYNONYMS)) {
    if (k.length >= MIN_LEN) vocab.add(k);
  }
  const intents = (intentsData as { intents: { patterns?: string[] }[] }).intents;
  for (const intent of intents) {
    for (const pattern of intent.patterns ?? []) {
      for (const w of pattern.toLowerCase().match(/[a-z]+/g) ?? []) {
        if (w.length >= MIN_LEN) vocab.add(w);
      }
    }
  }
  // Never correct INTO an ambiguous blocklisted word.
  for (const b of BLOCKLIST) vocab.delete(b);
  return [...vocab];
}

const VOCAB = buildVocab();
const VOCAB_SET = new Set(VOCAB);

function bestMatch(token: string): string | null {
  const cap = maxLev(token.length);
  let best: string | null = null;
  let bestJw = 0;
  let bestLev = Infinity;
  for (const cand of VOCAB) {
    if (Math.abs(cand.length - token.length) > cap) continue;
    const jw = jaroWinkler(token, cand);
    if (jw < JW_MIN) continue;
    const lev = levenshtein(token, cand);
    if (lev === 0 || lev > cap) continue;
    if (jw > bestJw || (jw === bestJw && lev < bestLev)) {
      best = cand;
      bestJw = jw;
      bestLev = lev;
    }
  }
  return best;
}

/**
 * Correct each word toward the nearest domain vocabulary term. Preserves
 * spacing/punctuation; case is normalized to lowercase on corrected words
 * (downstream classification/domain checks lowercase anyway).
 */
export function correctText(message: string): string {
  return message.replace(/[a-zA-Z]+/g, (word) => {
    const lower = word.toLowerCase();
    if (lower.length < MIN_LEN) return word;
    if (BLOCKLIST.has(lower)) return word;
    if (VOCAB_SET.has(lower)) return word; // already a known word
    return bestMatch(lower) ?? word;
  });
}
