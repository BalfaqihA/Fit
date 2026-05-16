// One-time admin script that provisions the owner test account so you can log
// in normally and land straight in the admin panel — no bootstrap screen, no
// secret, no email-verification step.
//
// It creates (or updates, if it already exists) the owner account with a known
// password and a verified email, stamps the `{admin:true, adminRole:'owner'}`
// custom claim, and writes the same `adminSettings/private` sentinel +
// `adminAuditLogs` entry the `adminBootstrapOwner` callable would, so the rest
// of the admin section stays consistent (owner shown in settings, owner
// protected from claim removal).
//
// USAGE
//   1. Get a service account key with Auth + Firestore access (Firebase
//      Console -> Project Settings -> Service accounts -> Generate new private
//      key).
//   2. Save it locally OUTSIDE the repo, e.g. `~/.config/fit-admin.json`.
//   3. From `functions-chatbot/`:
//        $env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME/.config/fit-admin.json"
//        npx ts-node scripts/seed-admin.ts
//
//   Re-runnable: re-runs just reset the password and re-stamp the claim.
//
//   NOTE: the admin SCREENS read data from the Cloud Functions, so the backend
//   must also be deployed once:
//        cd functions-chatbot ; npm run build ; cd ..
//        firebase deploy --only firestore:indexes   # wait until Enabled
//        firebase deploy --only firestore:rules
//        firebase deploy --only functions:chatbot

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const auth = getAuth();
const db = getFirestore();

const EMAIL = 'ahmed1.balfaqeih55@gmail.com';
const PASSWORD = '1221304386';
const ROLE = 'owner';

async function ensureUser(): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(EMAIL);
    await auth.updateUser(existing.uid, {
      password: PASSWORD,
      emailVerified: true,
      disabled: false,
    });
    console.log(`  updated existing user ${existing.uid}`);
    return existing.uid;
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as { code?: string }).code
        : undefined;
    if (code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      emailVerified: true,
    });
    console.log(`  created new user ${created.uid}`);
    return created.uid;
  }
}

async function main(): Promise<void> {
  console.log(`Seeding admin owner: ${EMAIL}`);

  const uid = await ensureUser();

  await auth.setCustomUserClaims(uid, { admin: true, adminRole: ROLE });
  console.log(`  set custom claims { admin: true, adminRole: '${ROLE}' }`);

  await db.doc('adminSettings/private').set(
    {
      ownerUid: uid,
      ownerEmail: EMAIL,
      bootstrappedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await db.collection('adminAuditLogs').add({
    actorUid: uid,
    actorEmail: EMAIL,
    actorRole: ROLE,
    action: 'admin.seed',
    targetType: 'user',
    targetId: uid,
    meta: null,
    at: FieldValue.serverTimestamp(),
  });

  console.log('Done.');
  console.log(
    `\nLog in with ${EMAIL} / ${PASSWORD}. A fresh sign-in mints a token` +
      ' that already carries the owner claim — Settings -> ADMIN appears.' +
      '\nIf you were already signed in as this account, sign out and back in.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
