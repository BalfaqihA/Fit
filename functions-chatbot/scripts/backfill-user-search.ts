// One-time backfill so EXISTING users become searchable and have correct
// follower/following counts after the community migration to Firestore.
//
// For every `users/{uid}` doc it writes:
//   - displayNameLower / handleLower  (lowercase mirrors for prefix search)
//   - searchTokens                    (any-word-prefix tokens for smart search)
//   - followerCount / followingCount  (recomputed from the `follows` collection)
//
// New accounts already get these at signup (lib/auth.ts, lib/google-auth.ts)
// and on every profile save (contexts/user-profile.tsx); this script only
// repairs accounts created before the migration. Re-runnable / idempotent.
//
// USAGE (from functions-chatbot/):
//   1. Service account key with Firestore access (Firebase Console ->
//      Project Settings -> Service accounts -> Generate new private key),
//      saved OUTSIDE the repo.
//   2. $env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME/.config/fit-admin.json"
//      npx ts-node scripts/backfill-user-search.ts

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

// Mirrors `buildUserSearchFields` in lib/users.ts — keep in sync.
function tokenize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function buildUserSearchFields(displayName: string, handle: string) {
  const displayNameLower = (displayName || '').trim().toLowerCase();
  const handleLower = (handle || '').trim().toLowerCase();
  const words = Array.from(
    new Set([...tokenize(displayName), ...tokenize(handle)]),
  ).slice(0, 12);
  const tokens = new Set<string>();
  for (const w of words) {
    const max = Math.min(w.length, 12);
    for (let i = 1; i <= max; i++) tokens.add(w.slice(0, i));
  }
  return {
    displayNameLower,
    handleLower,
    searchTokens: Array.from(tokens).slice(0, 150),
  };
}

async function countFollows(field: 'followerId' | 'followingId', uid: string) {
  const snap = await db
    .collection('follows')
    .where(field, '==', uid)
    .count()
    .get();
  return snap.data().count;
}

async function main(): Promise<void> {
  const users = await db.collection('users').get();
  console.log(`Backfilling ${users.size} user(s)…`);
  let done = 0;

  for (const docSnap of users.docs) {
    const d = docSnap.data() as Record<string, unknown>;
    const uid = docSnap.id;
    const fields = buildUserSearchFields(
      (d.displayName as string) ?? '',
      (d.handle as string) ?? '',
    );
    // `following` = people this user follows (followerId == uid).
    // `followers` = people who follow this user (followingId == uid).
    const [followingCount, followerCount] = await Promise.all([
      countFollows('followerId', uid),
      countFollows('followingId', uid),
    ]);

    await docSnap.ref.set(
      { ...fields, followerCount, followingCount },
      { merge: true },
    );
    done += 1;
    if (done % 25 === 0) console.log(`  …${done}/${users.size}`);
  }

  console.log(`Done. Updated ${done} user(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
