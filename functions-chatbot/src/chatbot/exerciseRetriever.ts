import { getFirestore } from 'firebase-admin/firestore';

import { stemTokens } from '../preprocess';

// Keyword retrieval over the seeded `exercise_library` Firestore collection
// (seed with scripts/seed-exercise-library.ts). The collection is bounded by
// the dataset (~233 docs), not by users, so we load it all once and score in
// memory — mirroring knowledgeRetriever.ts. A module-level TTL cache keeps
// warm invocations from re-reading Firestore every turn. When/if the dataset
// grows, swap the load for a Firestore query — the exported signature stays.

const COLLECTION = 'exercise_library';
const TOP_K = 5;
const CACHE_TTL_MS = 10 * 60 * 1000;

export type ExerciseKnowledgeDoc = {
  id: string;
  name: string;
  category?: string;
  equipment?: string;
  level?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

type CacheEntry = { at: number; docs: ExerciseKnowledgeDoc[] };
let cache: CacheEntry | null = null;

async function loadLibrary(): Promise<ExerciseKnowledgeDoc[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.docs;
  try {
    const snap = await getFirestore().collection(COLLECTION).get();
    const docs = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ExerciseKnowledgeDoc, 'id'>),
    }));
    cache = { at: Date.now(), docs };
    return docs;
  } catch (err) {
    console.warn('[chatbot] retrieveExerciseDocs: library load failed', err);
    return cache?.docs ?? [];
  }
}

export type ExerciseQuery = {
  message: string;
  exerciseNamesFromPlan: string[];
  equipment?: string;
  goal?: string;
  fitnessLevel?: string;
};

function scoreExercise(
  ex: ExerciseKnowledgeDoc,
  messageLower: string,
  messageStems: Set<string>,
  planNames: Set<string>,
  input: ExerciseQuery,
): number {
  let score = 0;
  const nameLower = (ex.name ?? '').toLowerCase();

  // 1. Exact / substring name match (highest).
  if (nameLower && messageLower.includes(nameLower)) {
    score += 6;
  } else {
    // 2. Token overlap on the name (alias-ish).
    for (const s of stemTokens(ex.name ?? '')) {
      if (messageStems.has(s)) {
        score += 4;
        break;
      }
    }
  }

  // 3. Primary-muscle match.
  for (const m of ex.primaryMuscles ?? []) {
    for (const s of stemTokens(m)) {
      if (messageStems.has(s)) {
        score += 3;
        break;
      }
    }
  }

  // 4. Equipment match (user's available equipment or mentioned in message).
  if (ex.equipment) {
    const eqLower = ex.equipment.toLowerCase();
    if (input.equipment && input.equipment.toLowerCase().includes(eqLower)) {
      score += 2;
    } else if (messageLower.includes(eqLower)) {
      score += 2;
    }
  }

  // 5. Level match.
  if (input.fitnessLevel && ex.level && ex.level === input.fitnessLevel) {
    score += 1;
  }

  // 6. Category match.
  if (ex.category) {
    for (const s of stemTokens(ex.category)) {
      if (messageStems.has(s)) {
        score += 1;
        break;
      }
    }
  }

  // Plan boost — surface exercises the user is actually scheduled to do.
  if (nameLower && planNames.has(nameLower)) score += 5;

  return score;
}

/**
 * Returns up to 5 exercise docs most relevant to the query. Plan exercises
 * are boosted so "what's my plan today?" surfaces them even when the message
 * names no exercise. Empty array when nothing scores > 0.
 */
export async function retrieveExerciseDocs(
  input: ExerciseQuery,
): Promise<ExerciseKnowledgeDoc[]> {
  const docs = await loadLibrary();
  if (docs.length === 0) return [];

  const messageLower = input.message.toLowerCase();
  const messageStems = new Set(stemTokens(input.message));
  const planNames = new Set(
    input.exerciseNamesFromPlan.map((n) => n.toLowerCase().trim()),
  );

  return docs
    .map((ex) => ({
      ex,
      score: scoreExercise(ex, messageLower, messageStems, planNames, input),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((s) => s.ex);
}
