import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

// Server-authoritative admin identity + permission model. The client mirrors
// `AdminRole`/`AdminPermission`/`ROLE_PERMISSIONS` in `types/admin.ts` purely
// for UI gating — THIS copy is the one that actually enforces access. Keep the
// two in sync; when they diverge, this file wins.

export type AdminRole = 'owner' | 'admin' | 'moderator' | 'analyst';

export type AdminPermission =
  | 'dashboard.view'
  | 'users.view'
  | 'users.status'
  | 'users.disable'
  | 'users.passwordReset'
  | 'reports.view'
  | 'reports.resolve'
  | 'content.moderate'
  | 'content.delete'
  | 'chatbot.view'
  | 'chatbot.feedback'
  | 'knowledge.view'
  | 'knowledge.write'
  | 'knowledge.delete'
  | 'analytics.view'
  | 'analytics.rebuild'
  | 'audit.view'
  | 'settings.view'
  | 'settings.write'
  | 'roles.manage'
  | 'maintenance.run';

export const ALL_PERMISSIONS: AdminPermission[] = [
  'dashboard.view',
  'users.view',
  'users.status',
  'users.disable',
  'users.passwordReset',
  'reports.view',
  'reports.resolve',
  'content.moderate',
  'content.delete',
  'chatbot.view',
  'chatbot.feedback',
  'knowledge.view',
  'knowledge.write',
  'knowledge.delete',
  'analytics.view',
  'analytics.rebuild',
  'audit.view',
  'settings.view',
  'settings.write',
  'roles.manage',
  'maintenance.run',
];

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  owner: ALL_PERMISSIONS,
  admin: [
    'dashboard.view',
    'users.view',
    'users.status',
    'users.passwordReset',
    'reports.view',
    'reports.resolve',
    'content.moderate',
    'content.delete',
    'chatbot.view',
    'chatbot.feedback',
    'knowledge.view',
    'knowledge.write',
    'knowledge.delete',
    'analytics.view',
    'audit.view',
    'settings.view',
  ],
  moderator: [
    'dashboard.view',
    'reports.view',
    'reports.resolve',
    'content.moderate',
    'users.view',
    'chatbot.view',
    'chatbot.feedback',
  ],
  analyst: ['dashboard.view', 'analytics.view', 'chatbot.view', 'users.view'],
};

export type AdminCtx = {
  uid: string;
  email: string | null;
  role: AdminRole;
  perms: Set<AdminPermission>;
};

/**
 * First statement of every admin callable. Verifies the caller is signed in,
 * carries the `admin` custom claim, has a known role, and (optionally) the
 * required permission or one of the required roles. `owner` bypasses the
 * per-permission check (it implicitly has everything). Throws `HttpsError`
 * (`unauthenticated` / `permission-denied`) on any failure.
 */
export function assertAdmin(
  req: CallableRequest,
  opts?: { perm?: AdminPermission; roles?: AdminRole[] },
): AdminCtx {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  const token = req.auth.token as {
    admin?: boolean;
    adminRole?: AdminRole;
    email?: string;
  };
  if (token.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin access required.');
  }
  const role = token.adminRole;
  if (!role || !(role in ROLE_PERMISSIONS)) {
    throw new HttpsError('permission-denied', 'Admin role missing or invalid.');
  }
  if (opts?.roles && opts.roles.length > 0 && !opts.roles.includes(role)) {
    throw new HttpsError('permission-denied', 'Insufficient admin role.');
  }
  const perms = new Set<AdminPermission>(ROLE_PERMISSIONS[role]);
  if (opts?.perm && role !== 'owner' && !perms.has(opts.perm)) {
    throw new HttpsError('permission-denied', 'Insufficient admin permission.');
  }
  return {
    uid: req.auth.uid,
    email: token.email ?? null,
    role,
    perms,
  };
}

export type AuditTarget = { type: string; id?: string } | null;

/**
 * Append-only accountability record. Best-effort: a logging failure is logged
 * to the function console but never rolls back the action it accompanies (the
 * action already happened by the time this is called).
 */
export async function writeAuditLog(
  actor: AdminCtx,
  action: string,
  target: AuditTarget,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await getFirestore()
      .collection('adminAuditLogs')
      .add({
        actorUid: actor.uid,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        meta: meta ?? null,
        at: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    console.error('[admin] writeAuditLog failed', { action }, err);
  }
}

/** Resolves a uid from either an explicit uid or an email. Used by the
 * owner-only role-management callables. */
export async function resolveUid(input: {
  uid?: string;
  email?: string;
}): Promise<string> {
  if (input.uid) return input.uid;
  if (input.email) {
    const rec = await getAuth().getUserByEmail(input.email);
    return rec.uid;
  }
  throw new HttpsError('invalid-argument', 'Provide a uid or email.');
}
