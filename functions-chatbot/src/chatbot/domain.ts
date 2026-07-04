import natural from 'natural';

// Deterministic, classifier-independent domain detection. The tf.js classifier
// can mis-tag loosely-phrased fitness questions ("give me two morning
// exercises") as off_topic / general_chat, which either redirects them or skips
// exercise grounding. These guards run on the raw message so in-domain turns
// always reach the LLM with the right context.
//
// We intentionally do NOT reuse preprocess.stemTokens here: its synonym layer
// is whitespace-split, so hyphenated/glued words ("high-protein") bypass the
// synonym map and stem inconsistently. For keyword detection we just need
// predictable overlap, so both the lexicon and the message go through the same
// raw tokenize + Porter-stem path below.

const stemmer = natural.PorterStemmer;

function stems(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).map((w) => stemmer.stem(w));
}

const FITNESS_SEED = [
  // training
  'workout', 'workouts', 'exercise', 'exercises', 'training', 'train', 'gym',
  'lift', 'lifting', 'reps', 'rep', 'cardio', 'stretch', 'stretches',
  'stretching', 'warmup', 'routine', 'hiit', 'mobility', 'plank', 'squat',
  'squats', 'pushup', 'pushups', 'pullup', 'deadlift', 'bench', 'curl',
  'lunge', 'lunges', 'plyometric',
  // muscles / body parts
  'chest', 'abs', 'core', 'shoulder', 'shoulders', 'glutes', 'glute', 'bicep',
  'biceps', 'tricep', 'triceps', 'hamstring', 'hamstrings', 'quad', 'quads',
  'calves',
  // nutrition
  'protein', 'calorie', 'calories', 'meal', 'meals', 'diet', 'carb', 'carbs',
  'nutrition', 'macro', 'macros', 'supplement', 'supplements', 'creatine',
  'hydration',
  // recovery
  'recovery', 'recover', 'soreness',
  // progress / goals / identity
  'progress', 'streak', 'fitness', 'strength', 'muscle', 'muscles', 'bulk',
  'stamina', 'endurance', 'beginner', 'intermediate', 'advanced', 'motivation',
  'motivated', 'workouts',
  // app help
  'app',
];

const EXERCISE_SEED = [
  'workout', 'workouts', 'exercise', 'exercises', 'train', 'training', 'gym',
  'lift', 'lifting', 'reps', 'stretch', 'stretches', 'stretching', 'warmup',
  'routine', 'move', 'moves', 'movement', 'squat', 'squats', 'pushup',
  'pushups', 'pullup', 'deadlift', 'bench', 'curl', 'lunge', 'plank', 'cardio',
  'hiit',
  // muscles (so "what can I do for abs / chest" is recognised)
  'chest', 'abs', 'core', 'shoulder', 'shoulders', 'glutes', 'glute', 'bicep',
  'triceps', 'tricep', 'hamstring', 'quad', 'quads', 'calves',
  // equipment
  'dumbbell', 'barbell', 'kettlebell', 'bodyweight', 'machine',
];

const FITNESS_STEMS = new Set(FITNESS_SEED.flatMap(stems));
const EXERCISE_STEMS = new Set(EXERCISE_SEED.flatMap(stems));

function hasOverlap(message: string, set: Set<string>): boolean {
  return stems(message).some((s) => set.has(s));
}

/**
 * True when the message touches any fitness / nutrition / progress / app topic.
 * Used to veto the off_topic short-circuit so in-domain turns always reach the
 * LLM (which still applies its own domain gate for anything truly off-topic).
 */
export function isFitnessDomain(message: string): boolean {
  return hasOverlap(message, FITNESS_STEMS);
}

/**
 * Narrower: the message is asking about exercises / workouts specifically.
 * Used to force `exercise_library` retrieval even when the classifier didn't
 * land on one of the exercise intents.
 */
export function looksLikeExerciseQuery(message: string): boolean {
  return hasOverlap(message, EXERCISE_STEMS);
}
