/* eslint-disable no-console */
// Chatbot intent-routing eval harness.
//
// Runs each phrasing through the REAL path the orchestrator uses to route a
// turn — classify with the tf.js model, then map to a broad intent — and
// compares the result to the expected broad intent. Reports accuracy split by
// group (clean / misspelled / held-out) plus a confusion list of the misses.
//
// USAGE (from functions-chatbot/):
//   npm run eval                 # baseline (typo corrector OFF)
//   CORRECTOR_ENABLED=1 npm run eval   # with the fuzzy corrector ON
//
// The before/after of those two runs is the FYP-defense "typo accuracy lift"
// chart. The corrector is only applied to the text we classify — never to what
// the LLM sees in production (see typoCorrect.ts).

import * as fs from 'fs';
import * as path from 'path';

import { mapToBroadIntent } from '../src/chatbot/intentMapper';
import { classifyMessage } from '../src/chatbot/templateFallback';

type Item = { text: string; expected: string; misspelled?: boolean };

// Lazily pull in the corrector only when the flag is on, so a baseline run has
// zero dependency on it (matches the "eval first, corrector later" ordering).
const correctorOn = process.env.CORRECTOR_ENABLED === '1';
let correct: (s: string) => string = (s) => s;
if (correctorOn) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  correct = require('../src/typoCorrect').correctText as (s: string) => string;
}

function load(file: string): Item[] {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return [];
  const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as { items?: Item[] };
  return parsed.items ?? [];
}

type GroupName = 'clean' | 'misspelled' | 'held-out';
type Result = { item: Item; predicted: string; ok: boolean; group: GroupName };

async function classifyToBroad(text: string): Promise<string> {
  const cls = await classifyMessage(correctorOn ? correct(text) : text);
  return mapToBroadIntent(cls.topTag);
}

async function run(): Promise<void> {
  const dataset = load('dataset.json');
  const heldOut = load('unknowns.json');

  const results: Result[] = [];
  for (const item of dataset) {
    const predicted = await classifyToBroad(item.text);
    results.push({
      item,
      predicted,
      ok: predicted === item.expected,
      group: item.misspelled ? 'misspelled' : 'clean',
    });
  }
  for (const item of heldOut) {
    const predicted = await classifyToBroad(item.text);
    results.push({ item, predicted, ok: predicted === item.expected, group: 'held-out' });
  }

  const groups: GroupName[] = ['clean', 'misspelled', 'held-out'];
  console.log(`\nChatbot routing eval — corrector ${correctorOn ? 'ON' : 'OFF'}\n`);
  const summary: Record<string, string> = {};
  for (const g of groups) {
    const rows = results.filter((r) => r.group === g);
    if (rows.length === 0) continue;
    const hits = rows.filter((r) => r.ok).length;
    summary[g] = `${hits}/${rows.length} (${((hits / rows.length) * 100).toFixed(1)}%)`;
  }
  const all = results.length;
  const allHits = results.filter((r) => r.ok).length;
  summary.OVERALL = `${allHits}/${all} (${((allHits / all) * 100).toFixed(1)}%)`;
  console.table(summary);

  const misses = results.filter((r) => !r.ok);
  if (misses.length > 0) {
    console.log('\nMisses (expected -> predicted):');
    for (const m of misses) {
      console.log(
        `  [${m.group}] "${m.item.text}"  ${m.item.expected} -> ${m.predicted}`,
      );
    }
  }
  console.log('');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
