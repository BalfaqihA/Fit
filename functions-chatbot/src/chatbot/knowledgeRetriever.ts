import { getFirestore } from 'firebase-admin/firestore';

import { stemTokens } from '../preprocess';

import type { BroadIntent, KnowledgeDoc } from './types';

// Keyword + tag retrieval over `fitness_knowledge`. v1 is intentionally
// simple: load the whole collection (capped at 200 docs), score each entry,
// return top 5. The collection size is bounded by content authoring, not
// users, so this is fine for a long time. When it gets too big, swap the
// in-memory scoring for Firestore vector search by replacing
// `scoreDocsAgainstQuery` — the function signature stays.

const COLLECTION = 'fitness_knowledge';
const TOP_K = 5;
const MAX_DOCS = 200;

export type RetrievalQuery = {
  message: string;
  intent: BroadIntent;
  goal?: string;
  fitnessLevel?: string;
};

type ScoredDoc = { doc: KnowledgeDoc; score: number };

// Map broad intent -> categories/tags it tends to match. Boosts docs in
// those categories when the user's intent overlaps.
const INTENT_CATEGORIES: Record<BroadIntent, string[]> = {
  workout_plan: ['workout', 'exercise', 'training', 'plan', 'form'],
  nutrition_advice: ['nutrition', 'diet', 'food', 'macros', 'supplement'],
  weight_loss: ['weight_loss', 'fat_loss', 'cardio', 'deficit'],
  muscle_gain: ['muscle_gain', 'hypertrophy', 'strength', 'protein'],
  motivation: ['motivation', 'mindset', 'consistency'],
  injury_warning: ['injury', 'recovery', 'mobility', 'pain'],
  app_help: ['app', 'how-to'],
  general_chat: [],
};

function scoreDoc(
  doc: KnowledgeDoc,
  messageStems: Set<string>,
  intentCategories: string[],
  goal: string | undefined,
  level: string | undefined,
): number {
  let score = 0;

  // Tag / keyword stem matches (weighted highest).
  const docTokens = new Set<string>();
  for (const t of doc.tags ?? []) {
    for (const s of stemTokens(t)) docTokens.add(s);
  }
  for (const k of doc.keywords ?? []) {
    for (const s of stemTokens(k)) docTokens.add(s);
  }
  // Title and category also contribute (smaller weight).
  for (const s of stemTokens(doc.title)) docTokens.add(s);
  if (doc.category) {
    for (const s of stemTokens(doc.category)) docTokens.add(s);
  }
  for (const stem of messageStems) {
    if (docTokens.has(stem)) score += 3;
  }

  // Intent / category overlap.
  if (doc.category && intentCategories.includes(doc.category)) score += 4;

  // Goal & fitness level alignment.
  if (goal && doc.goal && doc.goal === goal) score += 2;
  if (level && doc.fitnessLevel) {
    if (doc.fitnessLevel === level) score += 2;
    else if (doc.fitnessLevel === 'all') score += 1;
  }

  return score;
}

function scoreDocsAgainstQuery(
  docs: KnowledgeDoc[],
  q: RetrievalQuery,
): ScoredDoc[] {
  const messageStems = new Set(stemTokens(q.message));
  const categories = INTENT_CATEGORIES[q.intent] ?? [];
  return docs
    .map((doc) => ({ doc, score: scoreDoc(doc, messageStems, categories, q.goal, q.fitnessLevel) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);
}

/**
 * Returns up to 5 knowledge docs most relevant to the user query. Empty array
 * when nothing scores above zero — the prompt builder handles that gracefully
 * (it just omits the KNOWLEDGE BASE block).
 */
export async function retrieveKnowledge(
  q: RetrievalQuery,
): Promise<KnowledgeDoc[]> {
  const db = getFirestore();
  let docs: KnowledgeDoc[] = [];
  try {
    const snap = await db.collection(COLLECTION).limit(MAX_DOCS).get();
    docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KnowledgeDoc, 'id'>) }));
  } catch (err) {
    console.warn('[chatbot] retrieveKnowledge failed', err);
    return [];
  }

  if (docs.length === 0) return [];
  return scoreDocsAgainstQuery(docs, q).map((s) => s.doc);
}
