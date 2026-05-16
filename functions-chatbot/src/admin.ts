import { getAuth } from 'firebase-admin/auth';
import {
  FieldValue,
  Timestamp,
  getFirestore,
  type Query,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

import {
  assertAdmin,
  resolveUid,
  writeAuditLog,
  type AdminRole,
} from './adminAuth';

// All admin callables. Each handler runs `assertAdmin(...)` first (server-side
// claim + permission enforcement — the client guard is only UX) and every
// mutation appends an `adminAuditLogs` entry. The Admin SDK bypasses Firestore
// rules, so moderation writes succeed even though clients can't write those
// fields.

const REGION = 'us-central1';
const DEFAULT_PAGE = 25;
const MAX_PAGE = 100;

type Json = Record<string, unknown>;

function data(req: { data?: unknown }): Json {
  return (req.data ?? {}) as Json;
}

function clampLimit(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : DEFAULT_PAGE;
  return Math.min(MAX_PAGE, Math.max(1, n));
}

function tsToMs(v: unknown): number | null {
  return v instanceof Timestamp ? v.toMillis() : null;
}

function encodeCursor(v: number, id: string): string {
  return Buffer.from(JSON.stringify({ v, id })).toString('base64');
}

function decodeCursor(c: unknown): { v: number; id: string } | null {
  if (typeof c !== 'string' || !c) return null;
  try {
    const o = JSON.parse(Buffer.from(c, 'base64').toString('utf8'));
    if (typeof o?.v === 'number' && typeof o?.id === 'string') return o;
  } catch {
    /* malformed cursor → treat as first page */
  }
  return null;
}

/** Generic cursor pagination over a query ordered by `createdAt` desc. */
async function pageByCreatedAt(
  base: Query,
  limit: number,
  cursor: unknown,
): Promise<{ docs: FirebaseFirestore.QueryDocumentSnapshot[]; nextCursor: string | null }> {
  let q = base.orderBy('createdAt', 'desc');
  const cur = decodeCursor(cursor);
  if (cur) q = q.startAfter(Timestamp.fromMillis(cur.v));
  const snap = await q.limit(limit + 1).get();
  const all = snap.docs;
  const hasMore = all.length > limit;
  const docs = hasMore ? all.slice(0, limit) : all;
  const last = docs[docs.length - 1];
  const lastMs = last ? tsToMs(last.get('createdAt')) : null;
  const nextCursor =
    hasMore && last && lastMs != null ? encodeCursor(lastMs, last.id) : null;
  return { docs, nextCursor };
}

async function countOf(q: Query): Promise<number> {
  const snap = await q.count().get();
  return snap.data().count;
}

const onCallOpts = { region: REGION } as const;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const adminGetDashboard = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'dashboard.view' });
  const db = getFirestore();
  const [
    totalUsers,
    pendingReports,
    hiddenContent,
    unreviewedFeedback,
    knowledgeDocs,
  ] = await Promise.all([
    countOf(db.collection('users')),
    countOf(db.collection('reports').where('status', '==', 'pending')),
    countOf(
      db
        .collection('communityPosts')
        .where('moderationStatus', 'in', ['hidden', 'removed']),
    ),
    countOf(db.collection('chatbot_feedback').where('reviewed', '==', false)),
    countOf(db.collection('fitness_knowledge')),
  ]);

  const recentAuditSnap = await db
    .collection('adminAuditLogs')
    .orderBy('at', 'desc')
    .limit(10)
    .get();

  return {
    totalUsers,
    pendingReports,
    hiddenContent,
    unreviewedFeedback,
    knowledgeDocs,
    recentAudit: recentAuditSnap.docs.map((d) => ({
      id: d.id,
      action: d.get('action') ?? null,
      actorEmail: d.get('actorEmail') ?? null,
      targetType: d.get('targetType') ?? null,
      targetId: d.get('targetId') ?? null,
      atMs: tsToMs(d.get('at')),
    })),
  };
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const adminListUsers = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'users.view' });
  const db = getFirestore();
  const d = data(req);
  const limit = clampLimit(d.limit);
  const search =
    typeof d.search === 'string' ? d.search.trim().toLowerCase() : '';
  const statusFilter =
    typeof d.status === 'string' ? d.status : null;

  let docs: FirebaseFirestore.QueryDocumentSnapshot[];
  let nextCursor: string | null = null;

  if (search) {
    // Prefix search on the lowercase mirror field; single-field auto-indexed.
    const cur = decodeCursor(d.cursor);
    let q = db
      .collection('users')
      .where('displayNameLower', '>=', search)
      .where('displayNameLower', '<=', search + '')
      .orderBy('displayNameLower')
      .limit(limit + 1);
    if (cur) q = q.startAfter(cur.id);
    const snap = await q.get();
    const hasMore = snap.docs.length > limit;
    docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;
    const last = docs[docs.length - 1];
    nextCursor =
      hasMore && last
        ? encodeCursor(0, String(last.get('displayNameLower') ?? ''))
        : null;
  } else {
    const cur = decodeCursor(d.cursor);
    let q = db
      .collection('users')
      .orderBy('updatedAt', 'desc')
      .limit(limit + 1);
    if (cur) q = q.startAfter(Timestamp.fromMillis(cur.v));
    const snap = await q.get();
    const hasMore = snap.docs.length > limit;
    docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;
    const last = docs[docs.length - 1];
    const lastMs = last ? tsToMs(last.get('updatedAt')) : null;
    nextCursor =
      hasMore && last && lastMs != null
        ? encodeCursor(lastMs, last.id)
        : null;
  }

  let items = docs.map((doc) => {
    const u = doc.data();
    return {
      uid: doc.id,
      displayName: (u.displayName as string) ?? null,
      handle: (u.handle as string) ?? null,
      email: (u.email as string) ?? null,
      avatarUri: (u.avatarUri as string) ?? null,
      moderationStatus:
        ((u.moderation as Json | undefined)?.status as string) ?? 'active',
      totalXp: ((u.stats as Json | undefined)?.totalXp as number) ?? 0,
      totalWorkouts:
        ((u.stats as Json | undefined)?.totalWorkouts as number) ?? 0,
      updatedAtMs: tsToMs(u.updatedAt),
    };
  });

  // Status filter applied to the page (claims/moderation aren't part of the
  // index; documented narrowing trade-off to avoid a composite index).
  if (statusFilter) {
    items = items.filter((i) => i.moderationStatus === statusFilter);
  }

  return { items, nextCursor };
});

export const adminGetUser = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'users.view' });
  const db = getFirestore();
  const d = data(req);
  const uid = String(d.uid ?? '');
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.');

  const [profileSnap, modSnap] = await Promise.all([
    db.doc(`users/${uid}`).get(),
    db.doc(`userModeration/${uid}`).get(),
  ]);

  let authRec: Awaited<ReturnType<ReturnType<typeof getAuth>['getUser']>> | null =
    null;
  try {
    authRec = await getAuth().getUser(uid);
  } catch {
    /* user may exist only in Firestore — tolerate */
  }

  const profile = profileSnap.exists ? (profileSnap.data() as Json) : {};
  const [postCount, reportCount] = await Promise.all([
    countOf(db.collection('communityPosts').where('authorId', '==', uid)),
    countOf(db.collection('reports').where('reportedBy', '==', uid)),
  ]);

  return {
    uid,
    profile: {
      displayName: profile.displayName ?? null,
      handle: profile.handle ?? null,
      email: profile.email ?? authRec?.email ?? null,
      bio: profile.bio ?? null,
      avatarUri: profile.avatarUri ?? null,
      goals: profile.goals ?? [],
      fitnessLevel: profile.fitnessLevel ?? null,
      primaryGoal: profile.primaryGoal ?? null,
      stats: profile.stats ?? {},
      lastWorkoutAt: profile.lastWorkoutAt ?? null,
    },
    auth: authRec
      ? {
          disabled: authRec.disabled,
          emailVerified: authRec.emailVerified,
          createdAtMs: authRec.metadata.creationTime
            ? Date.parse(authRec.metadata.creationTime)
            : null,
          lastSignInMs: authRec.metadata.lastSignInTime
            ? Date.parse(authRec.metadata.lastSignInTime)
            : null,
          claims: authRec.customClaims ?? {},
        }
      : null,
    moderation: modSnap.exists ? modSnap.data() : { status: 'active' },
    counts: { posts: postCount, reportsFiledByUser: reportCount },
  };
});

export const adminUpdateUserStatus = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'users.status' });
  const db = getFirestore();
  const d = data(req);
  const uid = String(d.uid ?? '');
  const status = String(d.status ?? '');
  const note = typeof d.note === 'string' ? d.note.slice(0, 500) : null;
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.');
  if (!['active', 'suspended', 'banned'].includes(status)) {
    throw new HttpsError('invalid-argument', 'Invalid status.');
  }

  const at = FieldValue.serverTimestamp();
  const moderation = { status, note, by: actor.uid, at };
  await db.doc(`users/${uid}`).set({ moderation }, { merge: true });
  await db.doc(`userModeration/${uid}`).set(
    {
      status,
      currentNote: note,
      by: actor.uid,
      at,
      events: FieldValue.arrayUnion({
        action: `status:${status}`,
        note,
        by: actor.uid,
        atMs: Date.now(),
      }),
    },
    { merge: true },
  );
  await writeAuditLog(actor, 'users.status', { type: 'user', id: uid }, {
    status,
    note,
  });
  return { ok: true };
});

export const adminDisableUser = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { roles: ['owner'] });
  const d = data(req);
  const uid = String(d.uid ?? '');
  const disabled = d.disabled !== false; // default true
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.');

  await getAuth().updateUser(uid, { disabled });
  if (disabled) await getAuth().revokeRefreshTokens(uid);
  await writeAuditLog(actor, 'users.disable', { type: 'user', id: uid }, {
    disabled,
  });
  return { ok: true, disabled };
});

export const adminSendPasswordReset = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'users.passwordReset' });
  const d = data(req);
  const uid = String(d.uid ?? '');
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.');
  const rec = await getAuth().getUser(uid);
  if (!rec.email) {
    throw new HttpsError('failed-precondition', 'User has no email.');
  }
  const link = await getAuth().generatePasswordResetLink(rec.email);
  await writeAuditLog(actor, 'users.passwordReset', { type: 'user', id: uid });
  return { ok: true, email: rec.email, link };
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const adminListReports = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'reports.view' });
  const db = getFirestore();
  const d = data(req);
  const limit = clampLimit(d.limit);
  const status = typeof d.status === 'string' ? d.status : null;

  let base: Query = db.collection('reports');
  if (status) base = base.where('status', '==', status);
  const { docs, nextCursor } = await pageByCreatedAt(base, limit, d.cursor);

  const items = docs.map((doc) => {
    const r = doc.data();
    return {
      id: doc.id,
      postId: (r.postId as string) ?? null,
      reportedBy: (r.reportedBy as string) ?? null,
      reason: (r.reason as string) ?? '',
      status: (r.status as string) ?? 'pending',
      resolution: (r.resolution as string) ?? null,
      createdAtMs: tsToMs(r.createdAt),
    };
  });
  return { items, nextCursor };
});

export const adminGetReport = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'reports.view' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  if (!id) throw new HttpsError('invalid-argument', 'id required.');
  const snap = await db.doc(`reports/${id}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Report not found.');
  const r = snap.data() as Json;

  let post: Json | null = null;
  if (r.postId) {
    const ps = await db.doc(`communityPosts/${String(r.postId)}`).get();
    if (ps.exists) {
      const p = ps.data() as Json;
      post = {
        id: ps.id,
        authorId: p.authorId ?? null,
        authorName: p.authorName ?? null,
        caption: p.caption ?? '',
        imageUrl: p.imageUrl ?? null,
        videoUrl: p.videoUrl ?? null,
        moderationStatus: p.moderationStatus ?? 'visible',
      };
    }
  }
  return {
    id: snap.id,
    report: {
      postId: r.postId ?? null,
      reportedBy: r.reportedBy ?? null,
      reason: r.reason ?? '',
      status: r.status ?? 'pending',
      resolution: r.resolution ?? null,
      createdAtMs: tsToMs(r.createdAt),
    },
    post,
  };
});

/** Shared post moderation used by both resolveReport and hide/delete. */
async function setPostModeration(
  postId: string,
  moderationStatus: 'hidden' | 'removed' | 'visible',
  actorUid: string,
  reason: string | null,
): Promise<void> {
  const db = getFirestore();
  const at = FieldValue.serverTimestamp();
  await db.doc(`communityPosts/${postId}`).set(
    { moderationStatus, moderation: { by: actorUid, at, reason } },
    { merge: true },
  );
  await db.doc(`contentModeration/${postId}`).set(
    { type: 'post', moderationStatus, reason, by: actorUid, at },
    { merge: true },
  );
}

export const adminResolveReport = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'reports.resolve' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  const action = String(d.action ?? 'dismiss'); // dismiss | hidePost | removePost
  const note = typeof d.note === 'string' ? d.note.slice(0, 500) : null;
  if (!id) throw new HttpsError('invalid-argument', 'id required.');

  const reportRef = db.doc(`reports/${id}`);
  const snap = await reportRef.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Report not found.');
  const postId = String(snap.get('postId') ?? '');

  if (action === 'hidePost' && postId) {
    await setPostModeration(postId, 'hidden', actor.uid, note);
  } else if (action === 'removePost' && postId) {
    await setPostModeration(postId, 'removed', actor.uid, note);
  } else if (action !== 'dismiss') {
    throw new HttpsError('invalid-argument', 'Invalid resolve action.');
  }

  await reportRef.set(
    {
      status: 'resolved',
      resolution: action,
      resolutionNote: note,
      resolvedBy: actor.uid,
      resolvedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAuditLog(actor, 'reports.resolve', { type: 'report', id }, {
    action,
    postId,
  });
  return { ok: true };
});

export const adminRejectReport = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'reports.resolve' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  const note = typeof d.note === 'string' ? d.note.slice(0, 500) : null;
  if (!id) throw new HttpsError('invalid-argument', 'id required.');
  await db.doc(`reports/${id}`).set(
    {
      status: 'rejected',
      resolutionNote: note,
      resolvedBy: actor.uid,
      resolvedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAuditLog(actor, 'reports.reject', { type: 'report', id }, { note });
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Community moderation
// ---------------------------------------------------------------------------

export const adminHidePost = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'content.moderate' });
  const d = data(req);
  const postId = String(d.postId ?? '');
  const reason = typeof d.reason === 'string' ? d.reason.slice(0, 500) : null;
  if (!postId) throw new HttpsError('invalid-argument', 'postId required.');
  await setPostModeration(postId, 'hidden', actor.uid, reason);
  await writeAuditLog(actor, 'content.hide', { type: 'post', id: postId }, {
    reason,
  });
  return { ok: true };
});

async function deleteByQueryInChunks(q: Query): Promise<number> {
  const db = getFirestore();
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await q.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < 400) break;
  }
  return total;
}

export const adminDeletePost = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'content.delete' });
  const db = getFirestore();
  const d = data(req);
  const postId = String(d.postId ?? '');
  const hard = d.hard === true;
  const reason = typeof d.reason === 'string' ? d.reason.slice(0, 500) : null;
  if (!postId) throw new HttpsError('invalid-argument', 'postId required.');

  if (!hard) {
    await setPostModeration(postId, 'removed', actor.uid, reason);
    await writeAuditLog(actor, 'content.delete', { type: 'post', id: postId }, {
      hard: false,
      reason,
    });
    return { ok: true, hard: false };
  }

  const postRef = db.doc(`communityPosts/${postId}`);
  const snap = await postRef.get();
  const p = snap.exists ? (snap.data() as Json) : {};
  const imagePath = (p.imagePath as string) ?? null;
  const videoPath = (p.videoPath as string) ?? null;

  for (const path of [imagePath, videoPath]) {
    if (!path) continue;
    try {
      await getStorage().bucket().file(path).delete();
    } catch (err) {
      console.warn('[admin] storage delete failed', path, err);
    }
  }

  const removedComments = await deleteByQueryInChunks(
    db.collection('comments').where('postId', '==', postId),
  );
  const removedLikes = await deleteByQueryInChunks(
    db.collection('likes').where('postId', '==', postId),
  );
  await postRef.delete();
  await db.doc(`contentModeration/${postId}`).set(
    {
      type: 'post',
      moderationStatus: 'removed',
      reason,
      by: actor.uid,
      at: FieldValue.serverTimestamp(),
      hardDeleted: true,
    },
    { merge: true },
  );
  await writeAuditLog(actor, 'content.delete', { type: 'post', id: postId }, {
    hard: true,
    reason,
    removedComments,
    removedLikes,
  });
  return { ok: true, hard: true, removedComments, removedLikes };
});

export const adminDeleteComment = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'content.delete' });
  const db = getFirestore();
  const d = data(req);
  const commentId = String(d.commentId ?? '');
  const hard = d.hard === true;
  const reason = typeof d.reason === 'string' ? d.reason.slice(0, 500) : null;
  if (!commentId) {
    throw new HttpsError('invalid-argument', 'commentId required.');
  }
  const ref = db.doc(`comments/${commentId}`);
  if (hard) {
    await ref.delete();
  } else {
    await ref.set(
      {
        moderationStatus: 'removed',
        moderation: {
          by: actor.uid,
          at: FieldValue.serverTimestamp(),
          reason,
        },
      },
      { merge: true },
    );
  }
  await db.doc(`contentModeration/${commentId}`).set(
    {
      type: 'comment',
      moderationStatus: 'removed',
      reason,
      by: actor.uid,
      at: FieldValue.serverTimestamp(),
      hardDeleted: hard,
    },
    { merge: true },
  );
  await writeAuditLog(
    actor,
    'content.delete',
    { type: 'comment', id: commentId },
    { hard, reason },
  );
  return { ok: true, hard };
});

export const adminListPosts = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'content.moderate' });
  const db = getFirestore();
  const d = data(req);
  const limit = clampLimit(d.limit);
  const moderationStatus =
    typeof d.moderationStatus === 'string' ? d.moderationStatus : null;
  const search =
    typeof d.search === 'string' ? d.search.trim().toLowerCase() : '';

  let base: Query = db.collection('communityPosts');
  if (moderationStatus) {
    base = base.where('moderationStatus', '==', moderationStatus);
  }
  const { docs, nextCursor } = await pageByCreatedAt(base, limit, d.cursor);
  let items = docs.map((doc) => {
    const p = doc.data();
    return {
      id: doc.id,
      authorId: (p.authorId as string) ?? null,
      authorName: (p.authorName as string) ?? null,
      caption: (p.caption as string) ?? '',
      imageUrl: (p.imageUrl as string) ?? null,
      videoUrl: (p.videoUrl as string) ?? null,
      moderationStatus: (p.moderationStatus as string) ?? 'visible',
      likeCount: (p.likeCount as number) ?? 0,
      commentCount: (p.commentCount as number) ?? 0,
      createdAtMs: tsToMs(p.createdAt),
    };
  });
  if (search) {
    items = items.filter((i) =>
      i.caption.toLowerCase().includes(search),
    );
  }
  return { items, nextCursor };
});

// ---------------------------------------------------------------------------
// Chatbot
// ---------------------------------------------------------------------------

export const adminGetChatbotStats = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'chatbot.view' });
  const db = getFirestore();
  const [sessions, feedbackUp, feedbackDown, unreviewed] = await Promise.all([
    countOf(db.collection('chat_sessions')),
    countOf(db.collection('chatbot_feedback').where('rating', '==', 'up')),
    countOf(db.collection('chatbot_feedback').where('rating', '==', 'down')),
    countOf(db.collection('chatbot_feedback').where('reviewed', '==', false)),
  ]);
  return { sessions, feedbackUp, feedbackDown, unreviewed };
});

export const adminListChatbotUsage = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'chatbot.view' });
  const db = getFirestore();
  const d = data(req);
  const limit = clampLimit(d.limit);
  const cur = decodeCursor(d.cursor);
  let q = db.collection('chatbot_usage').orderBy('__name__').limit(limit + 1);
  if (cur) q = q.startAfter(cur.id);
  const snap = await q.get();
  const hasMore = snap.docs.length > limit;
  const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;
  const last = docs[docs.length - 1];
  return {
    items: docs.map((doc) => ({
      uid: doc.id,
      date: doc.get('date') ?? null,
      count: doc.get('count') ?? 0,
    })),
    nextCursor: hasMore && last ? encodeCursor(0, last.id) : null,
  };
});

export const adminListFeedback = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'chatbot.feedback' });
  const db = getFirestore();
  const d = data(req);
  const limit = clampLimit(d.limit);
  let base: Query = db.collection('chatbot_feedback');
  if (d.reviewed === true || d.reviewed === false) {
    base = base.where('reviewed', '==', d.reviewed);
  }
  if (d.rating === 'up' || d.rating === 'down') {
    base = base.where('rating', '==', d.rating);
  }
  const { docs, nextCursor } = await pageByCreatedAt(base, limit, d.cursor);
  return {
    items: docs.map((doc) => {
      const f = doc.data();
      return {
        id: doc.id,
        userId: (f.userId as string) ?? null,
        messageId: (f.messageId as string) ?? null,
        sessionId: (f.sessionId as string) ?? null,
        rating: (f.rating as string) ?? null,
        reason: (f.reason as string) ?? null,
        reviewed: (f.reviewed as boolean) ?? false,
        adminNote: (f.adminNote as string) ?? null,
        createdAtMs: tsToMs(f.createdAt),
      };
    }),
    nextCursor,
  };
});

export const adminReviewFeedback = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'chatbot.feedback' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  const adminNote =
    typeof d.adminNote === 'string' ? d.adminNote.slice(0, 1000) : null;
  if (!id) throw new HttpsError('invalid-argument', 'id required.');
  await db.doc(`chatbot_feedback/${id}`).set(
    {
      reviewed: true,
      reviewedBy: actor.uid,
      reviewedAt: FieldValue.serverTimestamp(),
      adminNote,
    },
    { merge: true },
  );
  await writeAuditLog(
    actor,
    'chatbot.feedback.review',
    { type: 'feedback', id },
    { adminNote },
  );
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

export const adminListKnowledge = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'knowledge.view' });
  const db = getFirestore();
  const d = data(req);
  const search =
    typeof d.search === 'string' ? d.search.trim().toLowerCase() : '';
  const category = typeof d.category === 'string' ? d.category : null;
  const status = typeof d.status === 'string' ? d.status : null;

  // Knowledge collection is small (authored, ~hundreds max); fetch + filter
  // in memory for flexible search without a forest of composite indexes.
  const snap = await db.collection('fitness_knowledge').limit(500).get();
  let items = snap.docs.map((doc) => {
    const k = doc.data();
    return {
      id: doc.id,
      title: (k.title as string) ?? '',
      category: (k.category as string) ?? null,
      tags: (k.tags as string[]) ?? [],
      status: (k.status as string) ?? 'active',
      updatedAtMs: tsToMs(k.updatedAt),
    };
  });
  if (search) {
    items = items.filter((i) => i.title.toLowerCase().includes(search));
  }
  if (category) items = items.filter((i) => i.category === category);
  if (status) items = items.filter((i) => i.status === status);
  items.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0));
  return { items, nextCursor: null };
});

export const adminGetKnowledge = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'knowledge.view' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  if (!id) throw new HttpsError('invalid-argument', 'id required.');
  const snap = await db.doc(`fitness_knowledge/${id}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Doc not found.');
  return { id: snap.id, ...(snap.data() as Json) };
});

function sanitizeKnowledge(input: Json): Json {
  const str = (v: unknown, max: number) =>
    typeof v === 'string' ? v.slice(0, max) : '';
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 50) : [];
  const title = str(input.title, 200).trim();
  const content = str(input.content, 20000).trim();
  if (!title || !content) {
    throw new HttpsError(
      'invalid-argument',
      'title and content are required.',
    );
  }
  return {
    title,
    content,
    category: str(input.category, 100) || null,
    tags: arr(input.tags),
    keywords: arr(input.keywords),
    goal: str(input.goal, 100) || null,
    fitnessLevel: str(input.fitnessLevel, 50) || null,
    difficulty: str(input.difficulty, 50) || null,
    safetyNotes: str(input.safetyNotes, 2000) || null,
  };
}

export const adminCreateKnowledge = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'knowledge.write' });
  const db = getFirestore();
  const d = data(req);
  const clean = sanitizeKnowledge((d.doc as Json) ?? {});
  const at = FieldValue.serverTimestamp();
  const ref = await db.collection('fitness_knowledge').add({
    ...clean,
    status: 'active',
    createdBy: actor.uid,
    createdAt: at,
    updatedBy: actor.uid,
    updatedAt: at,
  });
  await writeAuditLog(
    actor,
    'knowledge.create',
    { type: 'knowledge', id: ref.id },
    { title: clean.title },
  );
  return { ok: true, id: ref.id };
});

export const adminUpdateKnowledge = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'knowledge.write' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  if (!id) throw new HttpsError('invalid-argument', 'id required.');
  const clean = sanitizeKnowledge((d.doc as Json) ?? {});
  await db.doc(`fitness_knowledge/${id}`).set(
    { ...clean, updatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  await writeAuditLog(actor, 'knowledge.update', {
    type: 'knowledge',
    id,
  });
  return { ok: true };
});

export const adminArchiveKnowledge = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'knowledge.write' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  const archived = d.archived !== false;
  if (!id) throw new HttpsError('invalid-argument', 'id required.');
  await db.doc(`fitness_knowledge/${id}`).set(
    {
      status: archived ? 'archived' : 'active',
      updatedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeAuditLog(
    actor,
    'knowledge.archive',
    { type: 'knowledge', id },
    { archived },
  );
  return { ok: true, archived };
});

export const adminDeleteKnowledge = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'knowledge.delete' });
  const db = getFirestore();
  const d = data(req);
  const id = String(d.id ?? '');
  if (!id) throw new HttpsError('invalid-argument', 'id required.');
  await db.doc(`fitness_knowledge/${id}`).delete();
  await writeAuditLog(actor, 'knowledge.delete', { type: 'knowledge', id });
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const adminGetAnalyticsSummary = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'analytics.view' });
  const db = getFirestore();
  const d = data(req);
  const days =
    typeof d.days === 'number' && d.days > 0 ? Math.min(365, d.days) : 30;
  const cutoff = Timestamp.fromMillis(Date.now() - days * 86400000);

  const [
    totalUsers,
    newUsers,
    posts,
    comments,
    reports,
    feedbackUp,
    feedbackDown,
  ] = await Promise.all([
    countOf(db.collection('users')),
    countOf(db.collection('users').where('updatedAt', '>=', cutoff)),
    countOf(db.collection('communityPosts')),
    countOf(db.collection('comments')),
    countOf(db.collection('reports')),
    countOf(db.collection('chatbot_feedback').where('rating', '==', 'up')),
    countOf(db.collection('chatbot_feedback').where('rating', '==', 'down')),
  ]);

  return {
    source: 'live',
    rangeDays: days,
    totalUsers,
    newUsersApprox: newUsers,
    posts,
    comments,
    reports,
    feedbackUp,
    feedbackDown,
  };
});

export const adminRebuildDailyStats = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, {
    roles: ['owner'],
    perm: 'analytics.rebuild',
  });
  const db = getFirestore();
  const d = data(req);
  const toMs = typeof d.to === 'number' ? d.to : Date.now();
  const days =
    typeof d.days === 'number' && d.days > 0 ? Math.min(90, d.days) : 7;

  const written: string[] = [];
  for (let i = 0; i < days; i++) {
    const dayEnd = toMs - i * 86400000;
    const dayStart = dayEnd - 86400000;
    const lo = Timestamp.fromMillis(dayStart);
    const hi = Timestamp.fromMillis(dayEnd);
    const dateKey = new Date(dayStart).toISOString().slice(0, 10);
    const [newUsers, posts, comments, reports] = await Promise.all([
      countOf(
        db
          .collection('users')
          .where('updatedAt', '>=', lo)
          .where('updatedAt', '<', hi),
      ),
      countOf(
        db
          .collection('communityPosts')
          .where('createdAt', '>=', lo)
          .where('createdAt', '<', hi),
      ),
      countOf(
        db
          .collection('comments')
          .where('createdAt', '>=', lo)
          .where('createdAt', '<', hi),
      ),
      countOf(
        db
          .collection('reports')
          .where('createdAt', '>=', lo)
          .where('createdAt', '<', hi),
      ),
    ]);
    await db.doc(`adminStats/daily`).collection('days').doc(dateKey).set({
      date: dateKey,
      newUsers,
      posts,
      comments,
      reports,
      builtAt: FieldValue.serverTimestamp(),
      builtBy: actor.uid,
    });
    written.push(dateKey);
  }
  await writeAuditLog(actor, 'analytics.rebuild', { type: 'settings' }, {
    days,
  });
  return { ok: true, written };
});

// ---------------------------------------------------------------------------
// Audit logs
// ---------------------------------------------------------------------------

export const adminListAuditLogs = onCall(onCallOpts, async (req) => {
  assertAdmin(req, { perm: 'audit.view' });
  const db = getFirestore();
  const d = data(req);
  const limit = clampLimit(d.limit);
  const actionFilter = typeof d.action === 'string' ? d.action : null;
  const actorFilter = typeof d.actorUid === 'string' ? d.actorUid : null;

  // Unfiltered server-side ordering by `at` desc (single-field auto-index);
  // optional action/actor filters applied to the returned page to keep the
  // index surface minimal.
  let q = db.collection('adminAuditLogs').orderBy('at', 'desc');
  const cur = decodeCursor(d.cursor);
  if (cur) q = q.startAfter(Timestamp.fromMillis(cur.v));
  const snap = await q.limit(limit + 1).get();
  const hasMore = snap.docs.length > limit;
  const docs = hasMore ? snap.docs.slice(0, limit) : snap.docs;
  const last = docs[docs.length - 1];
  const lastMs = last ? tsToMs(last.get('at')) : null;

  let items = docs.map((doc) => {
    const a = doc.data();
    return {
      id: doc.id,
      action: (a.action as string) ?? null,
      actorUid: (a.actorUid as string) ?? null,
      actorEmail: (a.actorEmail as string) ?? null,
      actorRole: (a.actorRole as string) ?? null,
      targetType: (a.targetType as string) ?? null,
      targetId: (a.targetId as string) ?? null,
      meta: (a.meta as Json) ?? null,
      atMs: tsToMs(a.at),
    };
  });
  if (actionFilter) items = items.filter((i) => i.action === actionFilter);
  if (actorFilter) items = items.filter((i) => i.actorUid === actorFilter);

  return {
    items,
    nextCursor:
      hasMore && last && lastMs != null ? encodeCursor(lastMs, last.id) : null,
  };
});

// ---------------------------------------------------------------------------
// Settings & roles (owner-only mutations)
// ---------------------------------------------------------------------------

export const adminGetSettings = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, { perm: 'settings.view' });
  const db = getFirestore();
  const [pub, priv, roles] = await Promise.all([
    db.doc('adminSettings/public').get(),
    db.doc('adminSettings/private').get(),
    db.doc('adminSettings/roles').get(),
  ]);
  return {
    public: pub.exists ? pub.data() : {},
    private:
      actor.role === 'owner' && priv.exists
        ? {
            ownerEmail: priv.get('ownerEmail') ?? null,
            bootstrappedAtMs: tsToMs(priv.get('bootstrappedAt')),
          }
        : null,
    roles: actor.role === 'owner' && roles.exists ? roles.data() : null,
  };
});

export const adminUpdateSettings = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, {
    roles: ['owner'],
    perm: 'settings.write',
  });
  const db = getFirestore();
  const d = data(req);
  const patch = (d.patch as Json) ?? {};
  const allowed: Json = {};
  if (typeof patch.maintenanceMode === 'boolean') {
    allowed.maintenanceMode = patch.maintenanceMode;
  }
  if (patch.featureFlags && typeof patch.featureFlags === 'object') {
    allowed.featureFlags = patch.featureFlags;
  }
  allowed.updatedBy = actor.uid;
  allowed.updatedAt = FieldValue.serverTimestamp();
  await db.doc('adminSettings/public').set(allowed, { merge: true });
  await writeAuditLog(actor, 'settings.update', { type: 'settings' }, allowed);
  return { ok: true };
});

const ASSIGNABLE_ROLES: AdminRole[] = [
  'owner',
  'admin',
  'moderator',
  'analyst',
];

export const adminSetUserClaims = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, {
    roles: ['owner'],
    perm: 'roles.manage',
  });
  const db = getFirestore();
  const d = data(req);
  const role = String(d.role ?? '') as AdminRole;
  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'Invalid role.');
  }
  const uid = await resolveUid({
    uid: typeof d.uid === 'string' ? d.uid : undefined,
    email: typeof d.email === 'string' ? d.email : undefined,
  });

  await getAuth().setCustomUserClaims(uid, {
    admin: true,
    adminRole: role,
  });
  await getAuth().revokeRefreshTokens(uid);
  const rec = await getAuth().getUser(uid);
  await db.doc('adminSettings/roles').set(
    {
      [uid]: {
        role,
        email: rec.email ?? null,
        by: actor.uid,
        at: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );
  await writeAuditLog(actor, 'roles.set', { type: 'user', id: uid }, { role });
  return { ok: true, uid, role };
});

export const adminRemoveUserClaims = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, {
    roles: ['owner'],
    perm: 'roles.manage',
  });
  const db = getFirestore();
  const d = data(req);
  const uid = String(d.uid ?? '');
  if (!uid) throw new HttpsError('invalid-argument', 'uid required.');

  const ownerUid = (await db.doc('adminSettings/private').get()).get(
    'ownerUid',
  );
  if (uid === ownerUid) {
    throw new HttpsError(
      'failed-precondition',
      'Cannot remove the bootstrapped owner.',
    );
  }

  await getAuth().setCustomUserClaims(uid, null);
  await getAuth().revokeRefreshTokens(uid);
  await db.doc('adminSettings/roles').set(
    { [uid]: FieldValue.delete() },
    { merge: true },
  );
  await writeAuditLog(actor, 'roles.remove', { type: 'user', id: uid });
  return { ok: true };
});

// ---------------------------------------------------------------------------
// Maintenance / backfill (owner-only, one-time)
// ---------------------------------------------------------------------------

export const adminBackfillModeration = onCall(onCallOpts, async (req) => {
  const actor = assertAdmin(req, {
    roles: ['owner'],
    perm: 'maintenance.run',
  });
  const db = getFirestore();
  const d = data(req);
  const collection = String(d.collection ?? '');
  const batchSize =
    typeof d.batchSize === 'number'
      ? Math.min(400, Math.max(1, Math.floor(d.batchSize)))
      : 300;
  if (
    !['communityPosts', 'comments', 'chatbot_feedback'].includes(collection)
  ) {
    throw new HttpsError('invalid-argument', 'Unsupported collection.');
  }
  const field =
    collection === 'chatbot_feedback' ? 'reviewed' : 'moderationStatus';
  const value = collection === 'chatbot_feedback' ? false : 'visible';

  const cur = decodeCursor(d.cursor);
  let q = db.collection(collection).orderBy('__name__').limit(batchSize);
  if (cur) q = q.startAfter(cur.id);
  const snap = await q.get();

  let updated = 0;
  const batch = db.batch();
  for (const doc of snap.docs) {
    if (doc.get(field) === undefined) {
      batch.set(doc.ref, { [field]: value }, { merge: true });
      updated++;
    }
  }
  if (updated > 0) await batch.commit();

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor =
    snap.docs.length === batchSize && last
      ? encodeCursor(0, last.id)
      : null;

  await writeAuditLog(
    actor,
    'maintenance.backfill',
    { type: 'settings', id: collection },
    { updated, done: nextCursor === null },
  );
  return { ok: true, updated, scanned: snap.size, nextCursor };
});
