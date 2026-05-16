import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

import type {
  AdminSettings,
  AnalyticsSummary,
  AdminUserDetail,
  AuditLogEntry,
  DashboardSummary,
  FeedbackSummary,
  KnowledgeDoc,
  KnowledgeSummary,
  Paginated,
  ReportDetail,
  ReportSummary,
  AdminUserSummary,
} from '@/types/admin';

async function callAdmin<Req, Res>(name: string, req?: Req): Promise<Res> {
  const fn = httpsCallable<Req, Res>(functions, name);
  const res = await fn(req as Req);
  return res.data;
}

export type ListArgs = {
  limit?: number;
  cursor?: string | null;
  search?: string;
  status?: string;
  [k: string]: unknown;
};

export const adminApi = {
  bootstrapOwner: (secret: string) =>
    callAdmin<{ secret: string }, { ok: true; message: string }>(
      'adminBootstrapOwner',
      { secret },
    ),

  dashboard: () => callAdmin<void, DashboardSummary>('adminGetDashboard'),

  users: {
    list: (args: ListArgs) =>
      callAdmin<ListArgs, Paginated<AdminUserSummary>>(
        'adminListUsers',
        args,
      ),
    detail: (uid: string) =>
      callAdmin<{ uid: string }, AdminUserDetail>('adminGetUser', { uid }),
    updateStatus: (uid: string, status: string, note?: string) =>
      callAdmin<
        { uid: string; status: string; note?: string },
        { ok: true }
      >('adminUpdateUserStatus', { uid, status, note }),
    disable: (uid: string, disabled: boolean) =>
      callAdmin<
        { uid: string; disabled: boolean },
        { ok: true; disabled: boolean }
      >('adminDisableUser', { uid, disabled }),
    sendPasswordReset: (uid: string) =>
      callAdmin<
        { uid: string },
        { ok: true; email: string; link: string }
      >('adminSendPasswordReset', { uid }),
  },

  reports: {
    list: (args: ListArgs) =>
      callAdmin<ListArgs, Paginated<ReportSummary>>(
        'adminListReports',
        args,
      ),
    detail: (id: string) =>
      callAdmin<{ id: string }, ReportDetail>('adminGetReport', { id }),
    resolve: (id: string, action: string, note?: string) =>
      callAdmin<
        { id: string; action: string; note?: string },
        { ok: true }
      >('adminResolveReport', { id, action, note }),
    reject: (id: string, note?: string) =>
      callAdmin<{ id: string; note?: string }, { ok: true }>(
        'adminRejectReport',
        { id, note },
      ),
  },

  moderation: {
    listPosts: (args: ListArgs) =>
      callAdmin<
        ListArgs,
        Paginated<{
          id: string;
          authorId: string | null;
          authorName: string | null;
          caption: string;
          imageUrl: string | null;
          videoUrl: string | null;
          moderationStatus: string;
          likeCount: number;
          commentCount: number;
          createdAtMs: number | null;
        }>
      >('adminListPosts', args),
    hidePost: (postId: string, reason?: string) =>
      callAdmin<{ postId: string; reason?: string }, { ok: true }>(
        'adminHidePost',
        { postId, reason },
      ),
    deletePost: (postId: string, hard: boolean, reason?: string) =>
      callAdmin<
        { postId: string; hard: boolean; reason?: string },
        { ok: true; hard: boolean }
      >('adminDeletePost', { postId, hard, reason }),
    deleteComment: (commentId: string, hard: boolean, reason?: string) =>
      callAdmin<
        { commentId: string; hard: boolean; reason?: string },
        { ok: true; hard: boolean }
      >('adminDeleteComment', { commentId, hard, reason }),
  },

  chatbot: {
    stats: () =>
      callAdmin<
        void,
        {
          sessions: number;
          feedbackUp: number;
          feedbackDown: number;
          unreviewed: number;
        }
      >('adminGetChatbotStats'),
    listUsage: (args: ListArgs) =>
      callAdmin<ListArgs, Paginated<{ uid: string; date: string; count: number }>>(
        'adminListChatbotUsage',
        args,
      ),
    listFeedback: (args: ListArgs) =>
      callAdmin<ListArgs, Paginated<FeedbackSummary>>(
        'adminListFeedback',
        args,
      ),
    reviewFeedback: (id: string, adminNote?: string) =>
      callAdmin<{ id: string; adminNote?: string }, { ok: true }>(
        'adminReviewFeedback',
        { id, adminNote },
      ),
  },

  knowledge: {
    list: (args: ListArgs) =>
      callAdmin<ListArgs, Paginated<KnowledgeSummary>>(
        'adminListKnowledge',
        args,
      ),
    get: (id: string) =>
      callAdmin<{ id: string }, KnowledgeDoc>('adminGetKnowledge', { id }),
    create: (doc: Partial<KnowledgeDoc>) =>
      callAdmin<{ doc: Partial<KnowledgeDoc> }, { ok: true; id: string }>(
        'adminCreateKnowledge',
        { doc },
      ),
    update: (id: string, doc: Partial<KnowledgeDoc>) =>
      callAdmin<
        { id: string; doc: Partial<KnowledgeDoc> },
        { ok: true }
      >('adminUpdateKnowledge', { id, doc }),
    archive: (id: string, archived: boolean) =>
      callAdmin<
        { id: string; archived: boolean },
        { ok: true; archived: boolean }
      >('adminArchiveKnowledge', { id, archived }),
    remove: (id: string) =>
      callAdmin<{ id: string }, { ok: true }>('adminDeleteKnowledge', { id }),
  },

  analytics: {
    summary: (days?: number) =>
      callAdmin<{ days?: number }, AnalyticsSummary>(
        'adminGetAnalyticsSummary',
        { days },
      ),
    rebuildDaily: (days?: number) =>
      callAdmin<{ days?: number }, { ok: true; written: string[] }>(
        'adminRebuildDailyStats',
        { days },
      ),
  },

  audit: {
    list: (args: ListArgs) =>
      callAdmin<ListArgs, Paginated<AuditLogEntry>>(
        'adminListAuditLogs',
        args,
      ),
  },

  settings: {
    get: () => callAdmin<void, AdminSettings>('adminGetSettings'),
    update: (patch: Record<string, unknown>) =>
      callAdmin<{ patch: Record<string, unknown> }, { ok: true }>(
        'adminUpdateSettings',
        { patch },
      ),
  },

  roles: {
    set: (args: { uid?: string; email?: string; role: string }) =>
      callAdmin<typeof args, { ok: true; uid: string; role: string }>(
        'adminSetUserClaims',
        args,
      ),
    remove: (uid: string) =>
      callAdmin<{ uid: string }, { ok: true }>('adminRemoveUserClaims', {
        uid,
      }),
  },

  maintenance: {
    backfill: (collection: string, cursor?: string | null) =>
      callAdmin<
        { collection: string; cursor?: string | null },
        { ok: true; updated: number; scanned: number; nextCursor: string | null }
      >('adminBackfillModeration', { collection, cursor }),
  },
};
