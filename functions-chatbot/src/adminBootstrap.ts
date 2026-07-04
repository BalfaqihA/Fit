import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

// One-time owner bootstrap. There is a chicken-and-egg problem: every admin
// callable requires the `admin` custom claim, but nobody has it until the
// first owner is created. This callable is the single escape hatch, locked
// down four ways: (1) a deploy-time secret, (2) the caller's email must equal
// the hard-coded designated owner, (3) the email must be verified, (4) it
// refuses once an owner sentinel exists or the caller is already an admin.
// Safe to leave deployed, but the dev entry screen should be removed for the
// final build.

const ADMIN_BOOTSTRAP_SECRET = defineSecret('ADMIN_BOOTSTRAP_SECRET');
const OWNER_EMAIL = 'ahmed1.balfaqeih55@gmail.com';

export const adminBootstrapOwner = onCall(
  { region: 'us-central1', secrets: [ADMIN_BOOTSTRAP_SECRET] },
  async (req): Promise<{ ok: true; message: string }> => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.');
    }

    const data = (req.data ?? {}) as { secret?: string };
    if (String(data.secret ?? '') !== ADMIN_BOOTSTRAP_SECRET.value()) {
      throw new HttpsError('permission-denied', 'Invalid bootstrap secret.');
    }

    const token = req.auth.token as {
      email?: string;
      email_verified?: boolean;
      admin?: boolean;
    };
    const callerEmail = (token.email ?? '').toLowerCase();
    if (callerEmail !== OWNER_EMAIL) {
      throw new HttpsError(
        'permission-denied',
        'Not the designated owner account.',
      );
    }
    if (token.email_verified !== true) {
      throw new HttpsError(
        'failed-precondition',
        'Verify your email before bootstrapping.',
      );
    }
    if (token.admin === true) {
      throw new HttpsError('already-exists', 'Caller is already an admin.');
    }

    const db = getFirestore();
    const sentinelRef = db.doc('adminSettings/private');
    const sentinel = await sentinelRef.get();
    if (sentinel.exists && sentinel.data()?.ownerUid) {
      throw new HttpsError('already-exists', 'Owner already bootstrapped.');
    }

    const uid = req.auth.uid;
    await getAuth().setCustomUserClaims(uid, {
      admin: true,
      adminRole: 'owner',
    });
    await sentinelRef.set(
      {
        ownerUid: uid,
        ownerEmail: callerEmail,
        bootstrappedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await db.collection('adminAuditLogs').add({
      actorUid: uid,
      actorEmail: callerEmail,
      actorRole: 'owner',
      action: 'admin.bootstrap',
      targetType: 'user',
      targetId: uid,
      meta: null,
      at: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      message: 'Owner bootstrapped. Refresh your ID token to pick up access.',
    };
  },
);
