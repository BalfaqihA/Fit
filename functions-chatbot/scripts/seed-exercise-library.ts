// One-time (idempotent, re-runnable) script that seeds the `exercise_library`
// Firestore collection from the canonical dataset the Python plan generator
// already ships: functions/data/exercises.json.
//
// The chatbot's retrieveExerciseDocs() reads this collection so it can answer
// "what's today's plan?", "replace pushups", "how do I do a deadlift?" with
// dataset-grounded facts. firestore.rules makes it read-only to clients; only
// this admin-SDK script writes it.
//
// USAGE
//   1. Service-account key with Firestore access (Firebase Console -> Project
//      Settings -> Service accounts -> Generate new private key), saved OUTSIDE
//      the repo, e.g. ~/.config/fit-admin.json
//   2. From functions-chatbot/:
//        $env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME/.config/fit-admin.json"
//        npm run seed:exercises          # or: npx ts-node scripts/seed-exercise-library.ts
//
//   Against the emulator instead:
//        $env:FIRESTORE_EMULATOR_HOST = "localhost:8080"
//        npm run seed:exercises
//
//   Re-runnable: writes are merge:true keyed by the dataset `id`, so re-runs
//   just refresh fields.

import * as fs from 'fs';
import * as path from 'path';

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

type RawExercise = {
  id: string;
  name: string;
  category?: string;
  level?: string;
  equipment?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  images?: string[];
};

const COLLECTION = 'exercise_library';
const BATCH_LIMIT = 450; // < Firestore's 500 hard cap, with headroom.
const DATASET = path.join(
  __dirname,
  '..',
  '..',
  'functions',
  'data',
  'exercises.json',
);

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function main(): Promise<void> {
  if (!fs.existsSync(DATASET)) {
    throw new Error(`Dataset not found: ${DATASET}`);
  }
  const exercises = JSON.parse(
    fs.readFileSync(DATASET, 'utf8'),
  ) as RawExercise[];
  console.log(`Seeding ${exercises.length} exercises into ${COLLECTION}…`);

  let written = 0;
  for (let i = 0; i < exercises.length; i += BATCH_LIMIT) {
    const slice = exercises.slice(i, i + BATCH_LIMIT);
    const batch = db.batch();
    for (const ex of slice) {
      if (!ex.id) continue;
      batch.set(
        db.collection(COLLECTION).doc(ex.id),
        {
          id: ex.id,
          name: ex.name ?? ex.id,
          category: ex.category ?? null,
          level: ex.level ?? null,
          equipment: ex.equipment ?? null,
          primaryMuscles: ex.primaryMuscles ?? [],
          secondaryMuscles: ex.secondaryMuscles ?? [],
          instructions: ex.instructions ?? [],
          images: ex.images ?? [],
        },
        { merge: true },
      );
      written += 1;
    }
    await batch.commit();
    console.log(`  committed ${Math.min(i + BATCH_LIMIT, exercises.length)}/${exercises.length}`);
  }

  console.log(`Done. ${written} exercise docs written to ${COLLECTION}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
