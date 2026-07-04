// Client-side mirror of the admin role/permission model. The AUTHORITATIVE
// copy lives in `functions-chatbot/src/adminAuth.ts` and is what actually
// enforces access in Cloud Functions. This copy only drives UI gating
// (showing/hiding buttons). Keep the two in sync; the server copy wins.

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

const ALL_PERMISSIONS: AdminPermission[] = [
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

export type AdminClaims = {
  admin: boolean;
  adminRole?: AdminRole;
};

export type Paginated<T> = {
  items: T[];
  nextCursor: string | null;
};

export type DashboardSummary = {
  totalUsers: number;
  pendingReports: number;
  hiddenContent: number;
  unreviewedFeedback: number;
  knowledgeDocs: number;
  recentAudit: {
    id: string;
    action: string | null;
    actorEmail: string | null;
    targetType: string | null;
    targetId: string | null;
    atMs: number | null;
  }[];
};

export type AdminUserSummary = {
  uid: string;
  displayName: string | null;
  handle: string | null;
  email: string | null;
  avatarUri: string | null;
  moderationStatus: string;
  totalXp: number;
  totalWorkouts: number;
  updatedAtMs: number | null;
};

export type AdminUserDetail = {
  uid: string;
  profile: Record<string, unknown>;
  auth: {
    disabled: boolean;
    emailVerified: boolean;
    createdAtMs: number | null;
    lastSignInMs: number | null;
    claims: Record<string, unknown>;
  } | null;
  moderation: Record<string, unknown>;
  counts: { posts: number; reportsFiledByUser: number };
};

export type ReportSummary = {
  id: string;
  postId: string | null;
  reportedBy: string | null;
  reason: string;
  status: string;
  resolution: string | null;
  createdAtMs: number | null;
};

export type ReportDetail = {
  id: string;
  report: {
    postId: string | null;
    reportedBy: string | null;
    reason: string;
    status: string;
    resolution: string | null;
    createdAtMs: number | null;
  };
  post: Record<string, unknown> | null;
};

export type FeedbackSummary = {
  id: string;
  userId: string | null;
  messageId: string | null;
  sessionId: string | null;
  rating: string | null;
  reason: string | null;
  reviewed: boolean;
  adminNote: string | null;
  createdAtMs: number | null;
};

export type KnowledgeSummary = {
  id: string;
  title: string;
  category: string | null;
  tags: string[];
  status: string;
  updatedAtMs: number | null;
};

export type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  category?: string | null;
  tags?: string[];
  keywords?: string[];
  goal?: string | null;
  fitnessLevel?: string | null;
  difficulty?: string | null;
  safetyNotes?: string | null;
  status?: string;
};

export type AnalyticsSummary = {
  source: string;
  rangeDays: number;
  totalUsers: number;
  newUsersApprox: number;
  posts: number;
  comments: number;
  reports: number;
  feedbackUp: number;
  feedbackDown: number;
};

export type AuditLogEntry = {
  id: string;
  action: string | null;
  actorUid: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  atMs: number | null;
};

export type AdminSettings = {
  public: Record<string, unknown>;
  private: { ownerEmail: string | null; bootstrappedAtMs: number | null } | null;
  roles: Record<string, unknown> | null;
};
