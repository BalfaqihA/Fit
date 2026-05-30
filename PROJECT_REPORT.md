# Fit — Final Year Project Report

A comprehensive, A-to-Z record of everything that has been implemented in the **Fit** mobile/web fitness application. This document is organized for inclusion in the project report and is intended to be the single source of truth for what the system does, how it is built, and where each capability lives in the codebase.

---

## 1. Project Overview

**Fit** is a cross-platform fitness companion that combines personalized workout planning, progress tracking, a social community, gamification, and a Gemini-powered AI coaching assistant. The application runs natively on iOS and Android, and as a Progressive Web App via Expo Web.

- **Project type:** Final Year Project (BSc Computer Science).
- **Codename / Expo slug:** `Fit`.
- **Android package:** `com.ahmed_balfaqih.Fit`.
- **Version:** 1.0.0.
- **Repository layout:** Mono-repo. Mobile + Web client (Expo / React Native), Python Cloud Functions, Node.js Cloud Functions (chatbot + admin), data-engineering scripts, Firestore + Storage security rules.

### 1.1 Goals
1. Deliver a personalized weekly workout plan based on user goal, equipment, fitness level, session duration, and weekly frequency.
2. Track progress: weight history, body stats, personal records, weekly stats, achievements, XP/level.
3. Foster engagement through a social feed (posts, comments, likes, stories, follows, notifications).
4. Provide an AI fitness coach (Gemini-backed) with personalized, knowledge-grounded answers, safety guardrails, and gamified quizzes.
5. Give operators a full admin console for moderation, analytics, knowledge management, and user administration.

---

## 2. Technology Stack

### 2.1 Client (Mobile + Web)
- **Framework:** [Expo](https://expo.dev/) `~54.0.34` with the new React Native architecture enabled.
- **Language:** TypeScript `~5.9.2`.
- **UI:** React Native `0.81.5`, React `19.1.0`, React Native Web `~0.21.0`, Reanimated `~4.1.1`, Gesture Handler `~2.28.0`.
- **Routing:** `expo-router ~6.0.23` (file-based, typed routes enabled).
- **Auth & data:** Firebase Web SDK `^12.12.1` (Authentication, Firestore, Storage, Cloud Functions).
- **Native helpers:** `expo-image`, `expo-image-picker`, `expo-video`, `expo-haptics`, `expo-notifications`, `expo-auth-session` (Google sign-in), `expo-linear-gradient`, `expo-splash-screen`.
- **Storage:** `@react-native-async-storage/async-storage` 2.2.0 (auth persistence on native, settings storage).
- **Observability:** `@sentry/react-native ~7.2.0` for crash + exception reporting.
- **Markdown rendering:** `react-native-markdown-display ^7.0.2` (chatbot replies + knowledge entries).

### 2.2 Backend
- **Python Cloud Functions** ([functions/](functions/)): plan generation, account deletion, social-graph triggers, fan-out notifications, per-user insights snapshots, daily counter reconciliation.
- **Node.js Cloud Functions** ([functions-chatbot/](functions-chatbot/)): Gemini-backed chatbot pipeline, admin callable surface, rate-limiting, daily quotas, audit logging.
- **AI model:** Google Gemini (key managed via `defineSecret('GEMINI_API_KEY')`).
- **Local intent classifier:** TensorFlow.js model trained from `intents.json` and bundled with the chatbot functions ([functions-chatbot/src/preprocess.ts](functions-chatbot/src/preprocess.ts), [functions-chatbot/src/train.ts](functions-chatbot/src/train.ts), [functions-chatbot/model/](functions-chatbot/model/)).

### 2.3 Data store
- **Firestore** (multi-region: us-central1).
- **Cloud Storage for Firebase** for post images/videos, story media, avatar/cover images.
- **Security rules** ([firestore.rules](firestore.rules), [storage.rules](storage.rules)) enforce ownership, derive-only counters, content-size limits, and read-only chatbot collections.

### 2.4 Data engineering / dataset prep
- **fitness_data_project/** — local-only Python pipeline that cleans and fuses exercise datasets from GitHub and Kaggle, producing the `exercises.json` consumed by `generate_plan`.
- Scripts: `01_clean_github.py`, `02_clean_kaggle.py`, `03_link_datasets.py`, `04_merge_kaggle_parts.py`, `05_generate_workout_plan.py`, `06_link_datasets_fuzzy.py`.

### 2.5 Tooling
- **Testing:** Jest (`jest-expo ~54.0.0`) for client, Jest for chatbot/admin functions, `pytest` for Python functions.
- **Linting:** ESLint `^9.25.0` with `eslint-config-expo`.
- **Build / deploy:** EAS Build (`eas.json`), Firebase Hosting/Functions, EAS project id `54bac2ef-aae5-436c-8a77-3d77eb050d48`.
- **Native plugins:** `expo-router`, `expo-splash-screen`, `expo-image-picker`, `@sentry/react-native`, `expo-web-browser`, `expo-video`.

---

## 3. Application Structure

The client uses **file-based routing**. Every file under [app/](app/) maps to a route.

### 3.1 Tab navigator — [app/(tabs)/](app/(tabs)/)
- [index.tsx](app/(tabs)/index.tsx) — Home / today's workout.
- [dashboard.tsx](app/(tabs)/dashboard.tsx) — Progress dashboard.
- [community.tsx](app/(tabs)/community.tsx) — Social feed.
- [chatbot.tsx](app/(tabs)/chatbot.tsx) — AI coach chat.
- [settings/](app/(tabs)/settings/) — Settings cluster (see §6.8).

### 3.2 Auth flow — [app/auth/](app/auth/)
- `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `_layout.tsx`.

### 3.3 Onboarding wizard — [app/onboarding/](app/onboarding/)
Twelve screens — `index → gender → age → height → weight → fitness-level → goal → equipment → days-per-week → workout-duration → welcome-ready → profile-complete`.

### 3.4 Workout module — [app/workout/](app/workout/)
- `plan.tsx`, `week-plan.tsx`, `day/[day].tsx`, `day-exercises.tsx`.
- `start.tsx`, `active.tsx`, `rest.tsx`, `summary.tsx`.
- `exercise/[id].tsx`, `run/[index].tsx`.
- `log.tsx` (manual workout log), `history.tsx`, `calendar.tsx`.

### 3.5 Dashboard deep-screens — [app/dashboard/](app/dashboard/)
- `body-stats.tsx`, `body-stat/[key].tsx` (per-stat detail).
- `personal-records.tsx`, `personal-record/[id].tsx`.
- `activity.tsx` (weekly activity heatmap).

### 3.6 Community module — [app/community/](app/community/)
- `compose.tsx` (text/image/video post composer).
- `post/[id].tsx` (single post + comments thread).
- `profile/[id].tsx`, `profile/[id]/followers.tsx`, `profile/[id]/following.tsx`.
- `profile-edit.tsx` (display name, handle, bio, avatar, cover).
- `search.tsx` (user search powered by `buildUserSearchFields`).
- `notifications.tsx` (likes/comments/follows/new-post fan-out).
- `story-compose.tsx`, `story/[id].tsx` (24h ephemeral stories).
- `achievements/[uid].tsx` (achievements gallery for any user).

### 3.7 Admin console — [app/admin/](app/admin/)
- `index.tsx` (dashboard).
- `users/index.tsx`, `users/[uid].tsx`.
- `reports/index.tsx`, `reports/[id].tsx`.
- `moderation/index.tsx`.
- `chatbot/index.tsx`, `chatbot/feedback.tsx`.
- `knowledge/index.tsx`, `knowledge/[id].tsx`, `knowledge/new.tsx`.
- `analytics/index.tsx`, `audit/index.tsx`, `settings/index.tsx`, `settings/roles.tsx`.
- `admin-bootstrap.tsx` (one-time owner bootstrap).

---

## 4. Authentication & Account Management

Implemented in [lib/auth.ts](lib/auth.ts), [lib/google-auth.ts](lib/google-auth.ts), [lib/firebase.ts](lib/firebase.ts), and the [app/auth/](app/auth/) screens.

| Feature | Function | Notes |
|---|---|---|
| Email/password sign-up | `signUpWithEmail()` | Creates Firebase user, sets `displayName`, seeds `users/{uid}` doc with `buildUserSearchFields` for fast search. |
| Email/password sign-in | `signInWithEmail()` | |
| Sign out | `signOut()` | Wired with explicit `router.replace('/auth/login')` for reliable web behavior. |
| Password reset | `sendPasswordReset()` | Uses `sendPasswordResetEmail`. |
| Change password | `changePassword()` | Re-authenticates via `EmailAuthProvider.credential` before updating. |
| Delete account | `deleteAccount()` | Re-auths, calls Python `delete_account` callable to drop all subcollections, then `deleteUser()`. |
| Google sign-in | `useGoogleSignIn()` | Uses `expo-auth-session/providers/google`; falls back to a stub hook if native modules are unavailable. Profile auto-seeded via `ensureProfile()` in a transaction. |
| Auth state listener | `subscribeToAuthState()` | Drives the global `AuthContext`. |
| Error mapping | `mapAuthError()` | Maps Firebase auth error codes to user-friendly strings. |
| Web auth persistence | `lib/firebase.ts` | Web is pinned to `browserLocalPersistence`; native uses `getReactNativePersistence(AsyncStorage)`. |

**Auth gating** — `AuthGate` in [app/_layout.tsx](app/_layout.tsx) inspects `useAuth()` + `useSegments()` and redirects between `/auth/login`, `/(tabs)`, and the welcome screen.

---

## 5. Onboarding

Implemented as a stateful wizard backed by [contexts/onboarding.tsx](contexts/onboarding.tsx).

- **State shape (`OnboardingAnswers`):** `gender, age, heightCm, weightKg, fitnessLevel, primaryGoal, equipment, daysPerWeek, sessionMinutes`.
- **Mode:** `'full'` (initial signup) or `'change'` (re-running from settings to regenerate plan).
- **Equipment helper:** `pickPrimaryEquipment()` resolves a multi-select to the single key needed by the planner.
- **Per-screen validation:** Each step accepts/rejects via numeric range checks from [lib/validation.ts](lib/validation.ts) (`parseIntInRange`, `parseWeight`).
- **Final screen:** `profile-complete.tsx` patches the user profile and calls the Python `generate_plan` callable to produce a personalized plan.

---

## 6. Workout System

### 6.1 Plan generation (server-side)
**Cloud Function:** `generate_plan` in [functions/main.py](functions/main.py).

1. Reads `data/exercises.json` (≈1k exercises).
2. Filters by `EQUIPMENT_MAP[equipment]` and `level`.
3. Builds N days × M exercises (5/6/7 depending on session length).
4. Default sets/reps via `_default_sets()` and `_default_reps()` (depend on goal + level).
5. Persists to `users/{uid}/plans/{planId}` and sets `users/{uid}.currentPlanId`.

### 6.2 Plan consumption (client-side)
- [contexts/plan.tsx](contexts/plan.tsx) — subscribes to the current plan doc and exposes `plan`, `loading`, `error`, `history`, `loadHistory()`.
- [lib/plan-day.ts](lib/plan-day.ts) — date arithmetic (`computeDayNumber`, `daysSinceIso`, `planDayIndex`, `computeStreak`).
- [lib/plans.ts](lib/plans.ts) — `updatePlanDaysPerWeek()` for in-place editing.
- [lib/exercises.ts](lib/exercises.ts) — local `ExerciseRecord` reference data (`getExerciseById`, `exerciseImageUrl`).

### 6.3 Workout session
[contexts/workout-session.tsx](contexts/workout-session.tsx) manages a live workout.

- Persists the in-flight session to AsyncStorage so a crash/background can be resumed.
- Tracks: current day, current exercise index, completed sets, rest timer, total duration, calories estimate.
- Notifications: schedules a `notifyResumeWorkout()` reminder when paused; cancels on completion.
- On completion, posts to `lib/workouts.ts → recordCompletedWorkout()` which writes the workout doc, awards XP via the gamification module, and triggers achievement evaluation.

### 6.4 Manual log
[app/workout/log.tsx](app/workout/log.tsx) lets users record a workout retroactively without going through an active session.

### 6.5 Calendar & history
- `app/workout/calendar.tsx` — month grid coloured by workout density.
- `app/workout/history.tsx` — flat list of past sessions.
- Subscribed via [contexts/workout-history.tsx](contexts/workout-history.tsx) using a Firestore `onSnapshot` (ordered by `completedAt desc`).

### 6.6 Exercise detail
- `app/workout/exercise/[id].tsx` — full instructions, primary/secondary muscles, equipment, looping image animation.
- `components/rep-tracker.tsx` and `components/hold-tracker.tsx` — interactive set trackers (reps vs. timed holds).

### 6.7 Gamification
[lib/gamification.ts](lib/gamification.ts):
- `xpForExercise(sets, reps)` — `max(50, sets·reps·1.2)`.
- `xpForWorkout({exerciseXpSum, durationMin})` — exercise XP + `3·minutes` + 50 completion bonus.
- `levelFromXp(totalXp)` — 1000 XP per level; returns level, progress, remaining XP.

### 6.8 Settings (workout-related)
Under [app/(tabs)/settings/](app/(tabs)/settings/):
- `units.tsx` — kg/lb, km/mi.
- `notifications.tsx` — weekly weigh-in nudge, resume-workout reminder.
- `dark-mode.tsx`, `language.tsx`, `about.tsx`, `help-faq.tsx`, `privacy-policy.tsx`, `terms-of-service.tsx`.
- `change-password.tsx`, `delete-account.tsx`.

---

## 7. Progress & Dashboard

### 7.1 Body stats
- [hooks/use-body-stats.ts](hooks/use-body-stats.ts) computes current/min/max/start values from `users/{uid}/measurements`.
- [hooks/use-measurements.ts](hooks/use-measurements.ts) subscribes to the raw collection.
- [lib/measurements.ts](lib/measurements.ts) — `recordWeight(uid, kg)` writes a measurement and BMI is derived via `bmiFromKg(weightKg, heightCm)`.
- Weigh-in UX: [components/weigh-in-modal.tsx](components/weigh-in-modal.tsx), [components/weigh-in-banner.tsx](components/weigh-in-banner.tsx), and the new [components/weight-update-insight-sheet.tsx](components/weight-update-insight-sheet.tsx) (shows delta vs last week, most-active week, top exercise, after each weigh-in — driven by `users/{uid}/insights/latestWeightUpdate`).

### 7.2 Personal records & derived stats
- [hooks/use-derived-records.ts](hooks/use-derived-records.ts) — computes one-rep max estimates and progression timelines.
- `dashboard/personal-records.tsx` lists records; `dashboard/personal-record/[id].tsx` shows progression over time.

### 7.3 Weekly stats & activity
- [hooks/use-weekly-stats.ts](hooks/use-weekly-stats.ts) aggregates the current ISO week (workouts, minutes, calories, XP).
- `dashboard/activity.tsx` renders a heatmap of training intensity by day.

### 7.4 Achievements
[lib/achievements.ts](lib/achievements.ts) defines a registry of 14+ achievements with predicates:

| ID | Title | Trigger |
|---|---|---|
| `first_workout` | First Step | 1 workout |
| `workouts_10/25/50/100` | Getting Started → Centurion | N workouts |
| `minutes_500/1000/2500` | Time Invested → Marathon | Total minutes |
| `streak_3/7/30` | On a Roll → Unstoppable | Longest streak |
| `xp_1000/5000/10000` | Level 2 → XP Hunter | Total XP |
| `weight_logs_10/50` | Tracker → Consistent | Weight log count |

`checkAndUnlockAchievements()` runs after each workout/weigh-in, batches new unlocks, and emits bonus XP via `xp_events`.

---

## 8. Community / Social Layer

### 8.1 Posts
[lib/community.ts](lib/community.ts) exposes the full feed API:

- `createPost`, `deletePost`, `subscribeToFeed`, `loadMorePosts` (cursor pagination, default page size 10, max 100).
- `mapPost`, `mapComment`, `mapLike` — Firestore snapshot → typed model.
- Caption cap: 500 chars. Image and video upload via [lib/upload.ts](lib/upload.ts).

### 8.2 Likes
- Composite document id `{postId}_{uid}` enforces one-like-per-user at the rules level ([firestore.rules](firestore.rules)).
- `likePost`, `unlikePost`, `subscribeToLikedPostIds`.
- `likeCount` on posts is server-derived by the `on_like_created` / `on_like_deleted` triggers.

### 8.3 Comments
- `addComment` (max 500 chars), `deleteComment`, `subscribeToComments`.
- `commentCount` on posts is server-derived via `on_comment_created` / `on_comment_deleted`.
- Each comment carries the validated `postOwnerId` to enable notification routing without joins.

### 8.4 Follow graph
[lib/follows.ts](lib/follows.ts):
- Composite id `{followerId}_{followingId}` enforces one-follow-per-pair.
- `followUser`, `unfollowUser`.
- `subscribeFollowing`, `subscribeFollowers`, `subscribeIsFollowing`, `subscribeUserCounts`.
- Follower/following counters maintained by Python triggers `on_follow_created` / `on_follow_deleted` — never client-writable.

### 8.5 Stories (24h ephemeral)
[lib/stories.ts](lib/stories.ts):
- `createStory` (image or video), `deleteStory`, `subscribeLiveStories` (groups by author).
- `recordStoryView` (one doc per viewer, idempotent).
- `subscribeStoryViews` (author-only).
- `expiresAt` validated by Firestore rules to live within a 24h+1h slack window.
- Caption cap: 140 chars.
- UI: [components/story-ring.tsx](components/story-ring.tsx), `app/community/story/[id].tsx`, `app/community/story-compose.tsx`.

### 8.6 Notifications
[lib/community-notifications.ts](lib/community-notifications.ts):
- `subscribeNotifications(uid, cb)` — sorted desc by `createdAt`, page size 50.
- `markNotificationsRead(ids)`.
- Notifications written **only** by Python triggers (`on_like_created`, `on_comment_created`, `on_follow_created`, `on_post_created` fan-out, up to 500 followers per post).
- Types: `like | comment | follow | new_post`.

### 8.7 User search
[lib/users.ts](lib/users.ts):
- `buildUserSearchFields(displayName, handle)` produces lowercased prefixes + per-word prefixes mirrored on the user doc.
- `searchUsers(query, limit)` queries those denormalized fields for prefix and any-word-prefix matches.

### 8.8 Reports & moderation hooks (client)
- [lib/community.ts](lib/community.ts) → `reportPost(postId, reason)` writes to the write-only `reports` collection.
- [components/report-modal.tsx](components/report-modal.tsx) — user-facing report UI with reason validation (max 300 chars).
- Moderation status is server-set; clients only create posts with `moderationStatus: 'visible'` (enforced by rules).

### 8.9 Author-side activity feed
- `subscribeToOwnPostLikes`, `subscribeToOwnPostComments` plus [hooks/use-own-post-activity.ts](hooks/use-own-post-activity.ts) drive the in-app activity badge.

---

## 9. AI Chatbot ("FitBot")

A multi-stage pipeline implemented in [functions-chatbot/](functions-chatbot/). Client surface: [app/(tabs)/chatbot.tsx](app/(tabs)/chatbot.tsx), [hooks/use-chat-session.ts](hooks/use-chat-session.ts), [lib/chatbot.ts](lib/chatbot.ts).

### 9.1 Architecture (orchestrator pipeline)
File-by-file in [functions-chatbot/src/chatbot/](functions-chatbot/src/chatbot/):

1. **Crisis override** ([overrides.ts](functions-chatbot/src/overrides.ts) → `checkOverrides()`): vetted canned replies for self-harm, acute medical, etc. Gemini is never called.
2. **Intent classification** ([templateFallback.ts](functions-chatbot/src/chatbot/templateFallback.ts) → `classifyMessage()`): local TensorFlow.js model returns `topTag/topConf/secondTag/secondConf`. `intentMapper.ts → mapToBroadIntent()` collapses fine-grained tags to one of 14 broad intents (`workout_plan, todays_workout, exercise_substitution, exercise_form, weight_progress, weekly_stats, exercise_stats, nutrition_advice, weight_loss, muscle_gain, motivation, injury_warning, app_help, general_chat`).
3. **Personalization** ([personalize.ts](functions-chatbot/src/personalize.ts) → `buildPersonalContext(uid)`): reads `users/{uid}/insights/snapshot` for one-doc context (demographics, plan, totals, recent, streaks, PRs, weight trend).
4. **Safety pre-check** ([safetyRules.ts](functions-chatbot/src/chatbot/safetyRules.ts) → `preGeminiSafetyCheck()`): `none | caution | block`. `block` skips Gemini.
5. **Knowledge retrieval** ([knowledgeRetriever.ts](functions-chatbot/src/chatbot/knowledgeRetriever.ts) → `retrieveKnowledge()`): keyword/tag scoring over `fitness_knowledge` collection.
6. **Exercise retrieval** ([exerciseRetriever.ts](functions-chatbot/src/chatbot/exerciseRetriever.ts) → `retrieveExerciseDocs()`): pulls relevant entries from `exercise_library` for form/substitution intents.
7. **Daily quota** ([dailyQuota.ts](functions-chatbot/src/chatbot/dailyQuota.ts)): `DAILY_GEMINI_LIMIT = 50` per user per day. Over-cap → template fallback.
8. **Prompt assembly** ([promptBuilder.ts](functions-chatbot/src/chatbot/promptBuilder.ts) → `buildGeminiPrompt()`): JSON-schema prompt with system, persona, knowledge snippets, user context, safety reason.
9. **Gemini call** ([geminiClient.ts](functions-chatbot/src/chatbot/geminiClient.ts) → `callGemini()`): API key via Secret Manager; raises `GeminiFailureError` on transport/parse failure.
10. **Validation** ([responseValidator.ts](functions-chatbot/src/chatbot/responseValidator.ts) → `parseAndValidate()`): enforces the `GeminiAnswer` JSON schema (`answer, personalizedRecommendation, reason, steps, safetyWarning, followUpQuestion, suggestedActions, confidence`). Falls through to template fallback on schema break.
11. **Template fallback** ([templateFallback.ts](functions-chatbot/src/chatbot/templateFallback.ts) → `runTemplatePipeline()`): deterministic Markdown by intent + context, plus optional XP quiz attached.
12. **Memory** ([chatMemoryService.ts](functions-chatbot/src/chatbot/chatMemoryService.ts) → `loadMemory()`, `updateMemory()`): persistent `chat_memory/{uid}` doc (last goal, last recommended workout, disliked exercises, preferred tone).
13. **History** ([chatHistoryService.ts](functions-chatbot/src/chatbot/chatHistoryService.ts) → `getOrCreateActiveSession()`, `appendMessage()`): rolling chat sessions under `chat_sessions/{sessionId}/messages/{messageId}`.

### 9.2 Rate limiting
[rate-limit.ts](functions-chatbot/src/rate-limit.ts) → `consumeRateLimit()`. Per-minute caps:
- `SEND_CHAT_LIMIT`
- `QUIZ_ANSWER_LIMIT`

### 9.3 Quizzes (XP-rewarded)
The Gemini reply (or fallback) may attach a `quiz` payload. Answering goes back through the same callable with `{ quizAnswer: { id, selectedIndex, attemptId } }`. `gradeQuiz()` in [functions-chatbot/src/index.ts](functions-chatbot/src/index.ts):
- Daily quiz-XP cap: `DAILY_QUIZ_XP_CAP = 100`.
- Idempotent on `attemptId` (transaction; replaying returns the previously-awarded amount).
- Records `xp_events` with `source: 'chat_quiz'` and updates `stats.totalXp`, `stats.chatQuizXpToday`.

### 9.4 Style hints
Client can pass `styleHint` to switch persona: `beginner | advanced | motivational`. Pulled from chat preferences.

### 9.5 Feedback loop
`chatbot_feedback` collection: per-message thumbs up/down + optional reason (≤300 chars). Read by the admin console; never client-readable.

---

## 10. Admin Console

### 10.1 Authorisation
[functions-chatbot/src/adminAuth.ts](functions-chatbot/src/adminAuth.ts) is the **server-side authority**. Roles:
- `owner` — every permission.
- `admin` — full content + user mod, no role management.
- `moderator` — reports + content moderation only.
- `analyst` — read-only analytics + chatbot stats.

The client mirrors this in [types/admin.ts](types/admin.ts) **for UI gating only**.

### 10.2 Callable surface ([functions-chatbot/src/admin.ts](functions-chatbot/src/admin.ts))

Dashboard / users:
- `adminGetDashboard`, `adminListUsers`, `adminGetUser`, `adminUpdateUserStatus`, `adminDisableUser`, `adminSendPasswordReset`.

Moderation / reports:
- `adminListReports`, `adminGetReport`, `adminResolveReport`, `adminRejectReport`, `adminHidePost`, `adminDeletePost`, `adminDeleteComment`, `adminListPosts`, `adminBackfillModeration`.

Chatbot:
- `adminGetChatbotStats`, `adminListChatbotUsage`, `adminListFeedback`, `adminReviewFeedback`.

Knowledge management:
- `adminListKnowledge`, `adminGetKnowledge`, `adminCreateKnowledge`, `adminUpdateKnowledge`, `adminArchiveKnowledge`, `adminDeleteKnowledge`.

Analytics & operations:
- `adminGetAnalyticsSummary`, `adminRebuildDailyStats`.

Audit & settings:
- `adminListAuditLogs`, `adminGetSettings`, `adminUpdateSettings`.

Role management:
- `adminSetUserClaims`, `adminRemoveUserClaims` (owner-only).

### 10.3 Bootstrap
[functions-chatbot/src/adminBootstrap.ts](functions-chatbot/src/adminBootstrap.ts) → `adminBootstrapOwner` is a one-shot callable that promotes the first owner via a fixed allowlist. Driven by [app/admin-bootstrap.tsx](app/admin-bootstrap.tsx).

### 10.4 Audit log
Every admin mutation calls `writeAuditLog(actor, action, target, meta)` into `adminAuditLogs`. The console exposes it via `app/admin/audit/index.tsx`.

---

## 11. Insights Snapshot Pipeline

Per-user analytics live at `users/{uid}/insights/snapshot` (+ `latestWeightUpdate` for the weigh-in sheet). Maintained by Firestore triggers in [functions/main.py](functions/main.py):

- `on_profile_write` — demographics, preferences, plan summary.
- `on_workout_write` — totals, recent, streaks, consistency, top exercises.
- `on_measurement_write` — weight trend, rebuilds `latestWeightUpdate`.
- `on_achievement_write` — unlocked achievements summary.
- `on_plan_write` — current plan summary.

`bootstrap_insights` callable rebuilds the snapshot from scratch on demand (used during account repair or migrations). Pure-Python helpers live in [functions/insights.py](functions/insights.py) so they are unit-testable without Firestore.

This single doc is what the chatbot reads (`buildPersonalContext`) — no per-turn joins.

---

## 12. Counter Reconciliation Job

`reconcile_counters` ([functions/main.py](functions/main.py)) is a daily scheduled function (`every day 03:00`) that recomputes:
- `communityPosts.likeCount` and `commentCount` from the actual `likes` and `comments` documents.
- `users.followerCount` and `followingCount` from the actual `follows` documents.

This protects against drift if a trigger ever misses (e.g. cold-start timeout).

---

## 13. Storage & Uploads

[lib/upload.ts](lib/upload.ts):

- `MAX_POST_IMAGE_BYTES = 5 MB`, `MAX_PROFILE_IMAGE_BYTES = 3 MB`, `MAX_POST_VIDEO_BYTES = 50 MB`.
- `uploadImage`, `uploadVideo`, `deleteImage`.
- Path builders: `buildPostImagePath`, `buildPostVideoPath`, `buildStoryImagePath`, `buildStoryVideoPath`, `buildProfileImagePath`.
- `UploadError` custom error class for surfaced messages.

[storage.rules](storage.rules) restricts uploads to allowlisted MIME types (`jpeg/jpg/png/webp/heic/heif`, `mp4/quicktime/x-m4v/webm`), enforces size caps, and pins writes to the authenticated user's folder.

---

## 14. Validation & Schemas

- [lib/validation.ts](lib/validation.ts): `parseEmail`, `parsePassword` (min 8 chars), `parseIntInRange`, `parseWeight`, `parseDurationMin`. Returns a discriminated union `ParseResult<T>`.
- [lib/schemas.ts](lib/schemas.ts): tiny declarative `validateDoc<T>(schema, data)` used for Firestore document validation.

---

## 15. Notifications (Push + Local)

[lib/notifications.ts](lib/notifications.ts):

- `requestNotificationPermissionOnce()` — caches the result in AsyncStorage.
- `shouldShowNotificationSoftPrompt()` / `dismissNotificationSoftPrompt()` — soft-prompt UX in `_layout.tsx`'s `WeighInScheduler`.
- `scheduleWeeklyWeighIn(date?)` — weekly local notification ("Stay on track").
- `cancelWeeklyWeighIn()`.
- `notifyResumeWorkout(dayNum?)`, `cancelResumeReminder()` — re-engage paused sessions.
- `notifyLocally(title, body)` — generic.

---

## 16. Theming & Design System

- [contexts/theme.tsx](contexts/theme.tsx) — `ThemeMode = 'light' | 'dark' | 'system'`, persisted to AsyncStorage.
- [hooks/use-color-scheme.ts](hooks/use-color-scheme.ts) and `.web.ts` — platform-aware color scheme.
- [constants/design.ts](constants/design.ts) — palette (`COLORS`), `RADIUS`, `SHADOWS`.
- [constants/theme.ts](constants/theme.ts) — derived theme constants.
- [constants/workout-data.ts](constants/workout-data.ts), [constants/goals.ts](constants/goals.ts) — labels and copy.

---

## 17. Components Library (selected)

`components/` (in addition to those mentioned above):
- `post-card.tsx`, `post-video.tsx` — feed items.
- `comment-row.tsx` — comment renderer with avatar.
- `user-list-row.tsx` — used in search, followers/following, admin tables.
- `follow-button.tsx` — stateful follow/unfollow with optimistic UI.
- `story-ring.tsx` — animated gradient ring around author avatar when fresh stories are present.
- `resume-workout-prompt.tsx` — re-entry banner for paused sessions.
- `primary-button.tsx` — design-system button.
- `error-boundary.tsx` — class-component render-error catcher, wired to Sentry.
- `parallax-scroll-view.tsx`, `back-button.tsx`, `themed-text.tsx`, `themed-view.tsx`, `external-link.tsx`, `haptic-tab.tsx`, `hello-wave.tsx`.
- `ui/collapsible.tsx`, `ui/icon-symbol.tsx`, `ui/icon-symbol.ios.tsx`.
- `admin/admin-kit.tsx`, `admin/knowledge-form.tsx`.

---

## 18. Hooks (`hooks/`)

- `use-auth.ts` — wraps `AuthContext`.
- `use-user-profile.ts` / `use-user-by-id.ts` — current vs other-user profile streams.
- `use-onboarding.ts` — wraps `OnboardingContext`.
- `use-plan.ts` — wraps `PlanContext`.
- `use-workout-history.ts`, `use-weekly-stats.ts`, `use-derived-records.ts`.
- `use-body-stats.ts`, `use-measurements.ts`.
- `use-achievements.ts`.
- `use-posts.ts`, `use-comments.ts`, `use-user-posts.ts`, `use-stories.ts`, `use-follows.ts`, `use-community-notifications.ts`, `use-own-post-activity.ts`.
- `use-chat-session.ts` — chatbot session state.
- `use-weight-update-insights.ts` — drives the post-weigh-in sheet.
- `use-admin.ts`, `use-admin-list.ts`.
- `use-submit.ts` — generic guarded form submitter (used in onboarding screens, login, signup).
- `use-color-scheme.ts` + `.web.ts`, `use-theme.ts`, `use-theme-color.ts`.

---

## 19. Security Rules — Highlights

### 19.1 [firestore.rules](firestore.rules)
- All reads require `isSignedIn()`.
- User docs: any signed-in user can read (for profile views); subcollections (`workouts, measurements, xp_events, achievements, plans, insights`) are owner-only.
- `followerCount`/`followingCount` are NOT writable by clients — enforced by `affectedKeys().hasAny([...])` check on user-doc updates. Counter mutations only flow through Admin SDK triggers.
- `communityPosts` create: must set `authorId == auth.uid`, `likeCount == 0`, `commentCount == 0`, `moderationStatus == 'visible'`; caption ≤ 500 chars. Updates restricted to `caption, imageUrl, imagePath, updatedAt`.
- `comments`: author-only create with `postOwnerId` validated via `postOwnerMatches()` (cross-doc `get()`).
- `likes`: composite id `{postId}_{uid}`, same cross-doc check.
- `reports`: write-only (`allow read: if false`).
- `follows`: composite id `{followerId}_{followingId}`, no self-follow.
- `stories`: 24h + 1h slack `expiresAt` cap; viewers idempotent via id == viewerId.
- `notifications`: server-only writes, recipient-only reads, recipient-only `read` flag mutation, recipient-only delete.
- Chatbot collections (`fitness_knowledge, exercise_library, chat_memory, chatbot_usage, chat_sessions/*`): read-only for signed-in/owner; writes only via Admin SDK.
- Admin collections (`adminAuditLogs, adminStats, adminSettings, userModeration, contentModeration`): readable by admins (custom claim `admin == true`); never client-writable.

### 19.2 [storage.rules](storage.rules)
- Allowlisted image and video MIME types.
- Per-path size caps mirroring `lib/upload.ts` constants.
- All write paths anchored to `auth.uid == userId`.

---

## 20. Observability

[lib/observability.ts](lib/observability.ts):
- `captureException(err, {tags, context})` — wraps Sentry's API; safe to call before SDK init.
- `captureMessage(msg, {tags, level})` — for non-error breadcrumbs.

Used pervasively in contexts (`workout-history`, `plan`) and any callable error-path.

The `ErrorBoundary` ([components/error-boundary.tsx](components/error-boundary.tsx)) catches render-time exceptions and routes them through `captureException` with `tags: {area: 'render'}`.

---

## 21. Testing

### 21.1 Client tests ([lib/__tests__/](lib/__tests__/), [hooks/__tests__/](hooks/__tests__/))
- `community.test.ts` — feed creation, like/unlike, comment shape.
- `workouts.test.ts` — XP accounting, plan-day computation.
- `users.test.ts` — `buildUserSearchFields` and `searchUsers` cases.
- `validation.test.ts` — every parser branch.
- `schemas.test.ts` — `validateDoc` happy/sad paths.
- `upload-paths.test.ts`, `upload-validation.test.ts` — size/MIME/path builders.
- `uuid.test.ts` — id format checks.
- `use-submit.test.ts` — submitter idempotency / guard.

### 21.2 Chatbot tests ([functions-chatbot/test/](functions-chatbot/test/))
- `orchestrator.test.ts`, `promptBuilder.test.ts`, `responseValidator.test.ts`, `intentMapper.test.ts`, `knowledgeRetriever.test.ts`, `exerciseRetriever.test.ts`, `geminiClient.test.ts`, `safetyRules.test.ts`, `dailyQuota.test.ts`, `chatHistoryService.test.ts`.

### 21.3 Python tests ([functions/tests/](functions/tests/))
- `test_main.py` — callable contracts (`generate_plan`, `delete_account`, social triggers).
- `test_insights.py` — pure compute helpers in `insights.py`.

---

## 22. Data Engineering

[fitness_data_project/](fitness_data_project/) is the local-only Python project that builds the bundled exercise dataset.

Pipeline:
1. `01_clean_github.py` — clean a GitHub exercise dataset.
2. `02_clean_kaggle.py` — clean a Kaggle exercise dataset.
3. `03_link_datasets.py` — deterministic key joining.
4. `04_merge_kaggle_parts.py` — concatenate kaggle shards.
5. `05_generate_workout_plan.py` — offline plan generation for QA.
6. `06_link_datasets_fuzzy.py` — fuzzy-match leftover rows.

Outputs land in [functions/data/exercises.json](functions/data/exercises.json) (deployed alongside `generate_plan`) and [lib/exercises.ts](lib/exercises.ts) (bundled with the client for local lookups).

---

## 23. Seed / Migration Scripts

[functions-chatbot/scripts/](functions-chatbot/scripts/):
- `seed-admin.ts` — promote a user to `owner`.
- `seed-knowledge.ts` — populate `fitness_knowledge` from the curated knowledge JSON.
- `seed-exercise-library.ts` — populate `exercise_library` from the bundled exercise dataset.
- `backfill-user-search.ts` — one-off backfill of `buildUserSearchFields` for accounts created before search was introduced.
- `secret-setup.md` — operator notes for `GEMINI_API_KEY` in Secret Manager.

---

## 24. Web vs Native Differences (Handled)

- **Auth persistence** — `lib/firebase.ts` pins web to `browserLocalPersistence` (via `initializeAuth`) and native to `getReactNativePersistence(AsyncStorage)`.
- **Post-auth routing** — login and logout call `router.replace(...)` explicitly because the effect-based `AuthGate` redirect was unreliable on Expo Web after a Firebase auth state change.
- **Google sign-in** — `lib/google-auth.ts` swaps in a stub hook (`useGoogleSignInStub`) when `expo-auth-session/providers/google` cannot resolve native modules.
- **onSnapshot teardown noise** — Firestore listeners (`user-profile`, `workout-history`, `plan`) treat `permission-denied` during sign-out as benign so the browser console stays clean.

---

## 25. Build, Run & Deploy

```bash
# Client
npm install
npx expo start            # native dev server
npx expo start --web      # web dev server
npx expo run:android      # local Android build
npx expo run:ios          # local iOS build
npm test                  # Jest

# Python functions
cd functions
pip install -r requirements.txt
pytest

# Chatbot/admin functions
cd functions-chatbot
npm install
npm test
npm run build
firebase deploy --only functions
```

EAS Build is configured via `eas.json` for store-bound builds; the EAS project id is in `app.json` under `extra.eas`.

---

## 26. File-by-file Cheat Sheet

| Area | Path |
|---|---|
| Routing root | [app/_layout.tsx](app/_layout.tsx) |
| Auth screens | [app/auth/](app/auth/) |
| Onboarding screens | [app/onboarding/](app/onboarding/) |
| Tab navigator | [app/(tabs)/](app/(tabs)/) |
| Workout flow | [app/workout/](app/workout/) |
| Dashboard | [app/dashboard/](app/dashboard/) |
| Community | [app/community/](app/community/) |
| Admin | [app/admin/](app/admin/) |
| Contexts | [contexts/](contexts/) |
| Hooks | [hooks/](hooks/) |
| Components | [components/](components/) |
| Client lib | [lib/](lib/) |
| Types | [types/](types/) |
| Constants | [constants/](constants/) |
| Python functions | [functions/](functions/) |
| Node functions (chatbot/admin) | [functions-chatbot/](functions-chatbot/) |
| Firestore rules | [firestore.rules](firestore.rules) |
| Storage rules | [storage.rules](storage.rules) |
| Firestore indexes | [firestore.indexes.json](firestore.indexes.json) |
| Data pipeline | [fitness_data_project/](fitness_data_project/) |
| Native Android project | [android/](android/) |

---

## 27. Summary of What's Done

- ✅ Cross-platform Expo app (iOS, Android, Web) on the new RN architecture.
- ✅ Email/password + Google sign-in, password reset, change password, account deletion (with full Firestore subtree purge).
- ✅ Twelve-step onboarding wizard with mode-aware re-runs.
- ✅ Server-side personalized plan generation (Python) consuming a curated exercise dataset.
- ✅ Active workout sessions with auto-resume, rest timers, set/rep + hold trackers, calorie estimation.
- ✅ Manual workout logging.
- ✅ Workout history, calendar, weekly stats, body-stat tracking with BMI, personal records, weight-update insight sheet.
- ✅ 14+ achievements with XP rewards and a level system.
- ✅ Community feed: posts (text + image + video), comments, likes, follows, stories (24h ephemeral with view tracking), notifications (server fan-out), user search, profile edit, user-reported content.
- ✅ Gemini-powered chatbot with classifier-driven intent routing, RAG over `fitness_knowledge` + `exercise_library`, snapshot-based personalization, crisis overrides, safety rules, per-turn validation, deterministic template fallback, daily quota, per-minute rate limit, XP-rewarded quizzes, persistent chat memory + session history, thumbs-up/down feedback.
- ✅ Full admin console (dashboard, users, reports, moderation, chatbot stats + feedback review, knowledge CRUD, analytics, audit log, settings, role management) with a permission-based RBAC enforced server-side.
- ✅ Per-user insights snapshot pipeline maintained by Firestore triggers, plus a nightly counter-reconciliation job.
- ✅ Strict security rules (Firestore + Storage) covering ownership, derive-only counters, MIME/size caps, server-only writes for notifications and chatbot collections.
- ✅ Sentry-based observability with a global render `ErrorBoundary`.
- ✅ Comprehensive Jest + pytest test suites for client, chatbot functions, and Python functions.
- ✅ Web-specific reliability hardening: pinned auth persistence, explicit post-auth navigation, signOut-time `permission-denied` suppression.

---

*Generated as a structured inventory of the Fit codebase — for use as the technical-implementation backbone of the final project report.*
