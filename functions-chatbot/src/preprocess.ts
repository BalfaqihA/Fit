import natural from 'natural';

const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Synonym map applied before tokenization. Collapses common variants to a
// canonical token so the model treats them identically. Keys must be
// already-lowercased single words (no spaces).
const SYNONYMS: Record<string, string> = {
  // training verbs / nouns -> "workout"
  gym: 'workout',
  train: 'workout',
  training: 'workout',
  exercise: 'workout',
  exercising: 'workout',
  exercised: 'workout',
  lift: 'workout',
  lifting: 'workout',
  lifted: 'workout',
  session: 'workout',
  workout: 'workout',
  workouts: 'workout',

  // goals
  cut: 'fat_loss',
  cutting: 'fat_loss',
  shred: 'fat_loss',
  shredding: 'fat_loss',
  bulk: 'muscle_gain',
  bulking: 'muscle_gain',
  mass: 'muscle_gain',
  hypertrophy: 'muscle_gain',

  // body parts
  abs: 'core',
  stomach: 'core',
  tummy: 'core',
  belly: 'core',
  pecs: 'chest',
  delts: 'shoulder',
  shoulders: 'shoulder',
  quads: 'leg',
  hams: 'leg',
  hamstrings: 'leg',
  calves: 'leg',
  legs: 'leg',
  glutes: 'leg',

  // colloquialisms / strength
  swole: 'strong',
  jacked: 'strong',
  ripped: 'strong',
  buff: 'strong',
  fit: 'strong',

  // food
  food: 'nutrition',
  eat: 'nutrition',
  eating: 'nutrition',
  meal: 'nutrition',
  meals: 'nutrition',
  diet: 'nutrition',
  calories: 'nutrition',
  calorie: 'nutrition',
  protein: 'nutrition',
  carb: 'nutrition',
  carbs: 'nutrition',

  // recovery
  rest: 'recovery',
  resting: 'recovery',
  sleep: 'recovery',
  sleeping: 'recovery',
  sore: 'recovery',
  soreness: 'recovery',
  recover: 'recovery',
  recovering: 'recovery',
};

function applySynonyms(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      const stripped = w.replace(/[^a-z']/g, '');
      if (!stripped) return w;
      return SYNONYMS[stripped] ?? w;
    })
    .join(' ');
}

export function stemTokens(text: string): string[] {
  const normalized = applySynonyms(text || '');
  const tokens = tokenizer.tokenize(normalized);
  if (!tokens) return [];
  return tokens.map((t: string) => stemmer.stem(t));
}

export function buildVocab(allUtterances: string[]): string[] {
  const set = new Set<string>();
  for (const u of allUtterances) {
    for (const s of stemTokens(u)) set.add(s);
  }
  return [...set].sort();
}

export function vectorize(text: string, vocab: string[]): number[] {
  const stems = new Set(stemTokens(text));
  return vocab.map((v) => (stems.has(v) ? 1 : 0));
}
