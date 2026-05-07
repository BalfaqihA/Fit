# Chat Summary — Firebase Integration for FitLife

We built a complete Firebase backend for the FitLife Expo/React Native fitness app across two big planning + execution cycles.

---

## Cycle 1 — Auth foundation

**Goal:** Real Firebase Auth + Firestore-backed user profile.

**Decisions:**
- Firebase JS SDK (works in Expo Go)
- Email/Password auth + Firestore profile on signup
- Google button stubbed for later
- New Firebase project (`fitness-874c3`)

**Created:**
- `Fit/lib/firebase.ts` — SDK init with AsyncStorage persistence on native / IndexedDB on web
- `Fit/lib/auth.ts` — `signUp / signIn / signOut / sendPasswordReset / changePassword / mapAuthError`
- `Fit/contexts/auth.tsx` + `Fit/hooks/use-auth.ts`

**Modified:**
- `Fit/app/_layout.tsx` — added `AuthGate` redirect logic
- `Fit/contexts/user-profile.tsx` — now reads/writes Firestore `users/{uid}` via `onSnapshot`
- Login, signup, forgot-password, settings logout, change-password — all wired to real Firebase

---

## Cycle 2 — Onboarding + personalized plan generation

**Goal:** Persist onboarding answers, generate workout plans from the `fitness_data_project` data, show real exercise images + per-exercise instructions.

**Decisions:**
- Python Cloud Function for plan generation
- GitHub raw URLs for images (`yuhonas/free-exercise-db`)
- Bundled JSON dataset (build-time export from parquet)
- Plan history kept in `users/{uid}/plans/{planId}` subcollection

**Created:**
- `fitness_data_project/scripts/07_export_for_app.py` — exports 233 unique exercises (~227 KB JSON) to both `Fit/assets/data/` and `Fit/functions/data/`
- `Fit/functions/main.py` + `requirements.txt` — `generate_plan` HTTPS callable. Filters by goal/level/equipment, picks 5/6/7 exercises per day by duration, writes `users/{uid}/plans/{planId}` and updates `currentPlanId`
- `Fit/firebase.json`, `Fit/.firebaserc`, `Fit/firestore.rules`
- `Fit/lib/exercises.ts` — typed dataset access + `exerciseImageUrl()`
- `Fit/contexts/onboarding.tsx`, `Fit/hooks/use-onboarding.ts`
- `Fit/contexts/plan.tsx`, `Fit/hooks/use-plan.ts`
- `Fit/types/plan.ts`

**Modified:**
- `Fit/types/community.ts` — extended `UserProfile` with onboarding fields + `currentPlanId`
- All 7 onboarding screens — write to context (age, gender, height, weight, goal, fitness-level, equipment, workout-duration, days-per-week)
- `Fit/app/onboarding/profile-complete.tsx` — real summary + calls Cloud Function
- `Fit/app/(tabs)/index.tsx` — home hero card pulls today's plan day
- `Fit/app/workout/day/[day].tsx` — plan-driven exercise list with thumbnails
- `Fit/app/workout/start.tsx` — plan-driven session preview
- `Fit/app/workout/exercise/[id].tsx` — real GitHub images + per-exercise instructions
- `Fit/app/workout/run/[index].tsx` — image carousel during active workout
- `Fit/contexts/workout-session.tsx` — adapts dataset records into legacy `Exercise` shape so `RepTracker`/`HoldTracker` keep working

**Status:** TypeScript clean. Lint clean (0 errors).

---

## Cycle 3 — Production hardening + gamification

**Goal:** Close the gaps blocking a public release of the app itself (no store submission yet) — fix broken Firestore writes, finish the half-built XP/level system end-to-end, add account deletion, wire in observability, harden config, set up CI + smoke tests.

**Audit findings that drove this cycle:**
- `firestore.rules` only covered `users/{uid}` and `users/{uid}/plans/{planId}` — every write to `workouts`, `measurements` was implicit-denied. `lib/plans.ts:updatePlanDaysPerWeek` (called from the calendar) was also broken because `plans` was `allow write: if false`.
- XP was being calculated and incremented on `users/{uid}.stats.totalXp`, but it never went anywhere except the post-workout summary screen. Dashboard, profile, and community profile didn't surface it.
- `app/workout/log.tsx` Save button only fired an `Alert` — no Firestore write.
- Multiple silent `catch` blocks hid real failures. No crash reporting.
- No way for a user to delete their own account from inside the app.
- `generate_plan` Cloud Function had `cors_origins="*"`.
- No CI, no tests of any kind, no env separation between dev and prod Firebase.
- Confirmed: community feature is local-only (`AsyncStorage` seed data) — no Firestore community rules needed.

**Decisions:**
- Skip the chatbot tab (owner is implementing it separately).
- Achievement evaluation runs client-side after each workout completion. Anti-cheat is deferred to v2; if a leaderboard ships, move XP awarding into a Cloud Function trigger.
- Sentry wiring is staged behind a thin wrapper (`lib/observability.ts`) that logs to console today — flipping to Sentry is one-file edit + `npm install` once a DSN is provisioned. No `npm install` was run as part of this cycle.

**Created:**
- `Fit/lib/gamification.ts` — single source of truth for `xpForExercise`, `xpForWorkout`, `levelFromXp`, `LEVEL_XP`, `COMPLETION_BONUS_XP`, `XP_PER_MINUTE`. Replaces the inline `LEVEL_XP = 1000` previously hardcoded in `summary.tsx`.
- `Fit/lib/achievements.ts` — 16-achievement catalog (workouts × 5, minutes × 3, streaks × 3, XP × 3, weight-logs × 2). `evaluateAchievements`, `getAchievement`, `checkAndUnlockAchievements`. The unlock check batches: write achievement doc + bonus `xp_event` + increment `stats.totalXp` in one commit.
- `Fit/lib/observability.ts` — `captureException` / `captureMessage` boundary with inline instructions for swapping in `@sentry/react-native`.
- `Fit/hooks/use-achievements.ts` — `onSnapshot` over `users/{uid}/achievements`, ordered by `unlockedAt desc`.
- `Fit/app/community/achievements/[uid].tsx` — full achievements grid screen with locked/unlocked state, unlock dates, XP rewards.
- `Fit/app/(tabs)/settings/delete-account.tsx` — re-auth + "type DELETE" confirmation + destructive Alert flow.
- `Fit/.github/workflows/ci.yml` — runs `tsc --noEmit`, `npm run lint`, and `python -m py_compile main.py` on push/PR.
- `Fit/.maestro/` — three smoke flows (`signup.yaml`, `log-workout.yaml`, `sign-out-back-in.yaml`) + README with run instructions.
- `Fit/.env.example` — documents the `EXPO_PUBLIC_FIREBASE_*` vars expected for prod env separation.

**Modified:**
- `Fit/firestore.rules` — owner-only rules for `users/{uid}` and every actually-used subcollection: `workouts`, `measurements`, `xp_events` (new), `achievements` (new), `plans`. Plans now allow client `update` (for `updatePlanDaysPerWeek`); `create`/`delete` stay admin-only.
- `Fit/lib/workouts.ts` — `recordCompletedWorkout` now also writes a `users/{uid}/xp_events/{eventId}` doc with `source: 'workout' | 'manual_log' | 'achievement'`. Added inline note about double-counting risk.
- `Fit/lib/auth.ts` — added `deleteAccount(currentPassword)` that re-auths, calls the new `delete_account` callable, deletes the Firebase user, signs out.
- `Fit/lib/firebase.ts` — config now reads from `process.env.EXPO_PUBLIC_FIREBASE_*` with current values as fallback. `.env.development` / `.env.production` added to `.gitignore`.
- `Fit/lib/storage.ts`, `Fit/lib/notifications.ts`, `Fit/app/workout/calendar.tsx`, `Fit/app/workout/summary.tsx`, `Fit/app/workout/log.tsx` — every silent `catch` now reports through `captureException` with `area`/`op` tags and context.
- `Fit/lib/notifications.ts` — added `shouldShowNotificationSoftPrompt` + `dismissNotificationSoftPrompt` so the irreversible iOS system dialog only fires after the in-app explainer.
- `Fit/app/_layout.tsx` — `WeighInScheduler` now gates the system permission ask behind a soft-prompt Alert.
- `Fit/functions/main.py` — `cors_origins` tightened from `"*"` to a Firebase-Hosting-domain allowlist. Added `delete_account` callable that recursively deletes `users/{uid}/{workouts,measurements,plans,xp_events,achievements}` then the user doc.
- `Fit/app/workout/log.tsx` — replaced the `Alert.alert('Entry saved', ...)` stub with a real persistence path: computes XP via `xpForWorkout`, writes through `recordCompletedWorkout` with `source: 'manual_log'`, runs the achievement check, and surfaces newly-unlocked badges in the success Alert.
- `Fit/app/workout/summary.tsx` — replaced inline level math with `levelFromXp`. Added an "Achievements Unlocked" card that renders any badges earned by this session.
- `Fit/app/(tabs)/dashboard.tsx` — new Level pill + progress bar at the top, tappable → routes to `/community/achievements/{uid}`.
- `Fit/app/community/profile/[id].tsx` — level chip next to the display name (own profile only) + horizontal achievements row showing the 5 most recent unlocks with "See all" → detail screen. Cross-user XP visibility deferred (community is still local-only).
- `Fit/app/(tabs)/settings/index.tsx` — added "Delete Account" row in the ACCOUNT section.

**Status:** TypeScript clean (`npx tsc --noEmit` exit 0). Lint clean (0 errors; one pre-existing unused-import warning in `app/onboarding/weight.tsx` from a prior cycle).

---

## Cycle 4 — Home section cleanup, consistency, reliability

**Goal:** Tighten the Home tab and every page reachable from it (Start Workout, Exercise Library, Week Plan, Calendar, History, Log Workout, Today's Exercises, Plan Day detail). Mix of correctness fixes (broken `firestore.rules`, manual log not persisting weight/RPE/notes, duplicate Firestore listeners), copy/icon/wording consistency, and small UX upgrades (real avatar, loading state, empty-state CTA, next-workout preview).

**Audit findings that drove this cycle:**
- `firestore.rules` ended with a stray backtick on line 100 — file would fail to deploy.
- Home created **two parallel `onSnapshot` listeners** on `users/{uid}/workouts`: `useTodayWorkout()` calls `useWorkoutHistory()`, and `useWeeklyStats()` independently calls `useWorkoutHistory()`. Each instance set up its own subscription.
- Home card said `Library`; destination header said `Exercise Library`.
- Both Home hero and Start Workout empty state used the same `Generate your plan` text — no clear differentiation.
- `app/workout/day/[day].tsx` hardcoded `Today` as the banner label and `Today's exercises` as the section title regardless of which plan day was opened.
- Home avatar was a plain person icon — `profile.avatarUri` already existed in the user doc but was never displayed.
- `app/workout/log.tsx` collected `weight`, `rpe`, and `notes`, but the `recordCompletedWorkout` payload only included sets/reps/exerciseName. The values appeared in the success Alert and were then lost.
- `Weight (kg)` was hardcoded in both `app/workout/log.tsx` and `components/weigh-in-modal.tsx` although `profile.weightUnit` already existed.
- Tab layout had no `tabBarHideOnKeyboard` setting; Log Workout's text inputs could be hidden behind the keyboard on some platforms.
- Home had no loading state — flashed the empty/no-plan UI for users with a plan during cold start.
- Home had no visible CTA for new users with no plan beyond the hero card's small play button.
- Home stats read `profile.stats`; History/Calendar derived from `users/{uid}/workouts` — divergence was possible.

**Decisions:**
- Single Firestore subscription via a top-level `WorkoutHistoryProvider` (mirrors `UserProfileProvider` pattern). All existing call sites — `useWorkoutHistory`, `useTodayWorkout`, `useWeeklyStats`, History/Calendar/Today's Exercises/Dashboard — keep working unchanged because the hook signature is preserved; only the data source moved into a context.
- Home stats derived from the shared `sessions` array (single source of truth) so Home, History, and Calendar always agree. Falls back to `profile.stats` only during the first paint while sessions are still loading.
- For the manual log unit handling, store weight canonically in kg (so existing `weightKg` consumers keep working) and convert from `lb` at the input boundary. Same approach in the weigh-in modal — display in user's unit, validate against the unit's range, persist `weightKg`.
- For Plan Day labels, compute `isToday` from the user's `planStartDate` modulo plan length and conditionally swap `Today` ↔ `Plan Day` rather than always showing one or the other.
- Exercise Library search polish (task 12) was already implemented (`autoCorrect={false}`, `returnKeyType="search"`, conditional clear-X icon) — verified, no edit.

**Created:**
- `Fit/contexts/workout-history.tsx` — `WorkoutHistoryProvider` runs the single `onSnapshot('users/{uid}/workouts')` subscription, exposes `{ sessions, loading }`, carries the new optional `notes` field on each session doc.

**Modified:**
- `Fit/firestore.rules` — removed stray backtick on line 100; file now ends at the closing `}`.
- `Fit/hooks/use-workout-history.ts` — replaced its own `useState`/`useEffect`/`onSnapshot` with `useContext(WorkoutHistoryContext)`. `useTodayWorkout` and `useWeeklyStats` now share the same single subscription. Re-exports `WorkoutSessionDoc` so existing imports in `history.tsx` and `use-derived-records.ts` keep working.
- `Fit/app/_layout.tsx` — mounted `<WorkoutHistoryProvider>` inside the auth/profile provider stack (after `UserProfileProvider`, before `PlanProvider`).
- `Fit/lib/workouts.ts` — extended `CompletedExerciseLog` with optional `weightKg` + `rpe`; extended `CompletedWorkoutPayload` with optional `notes`. `recordCompletedWorkout` already spreads the session payload so the new fields persist with no DB-side change.
- `Fit/app/(tabs)/_layout.tsx` — added `tabBarHideOnKeyboard: false` to `screenOptions`.
- `Fit/app/(tabs)/index.tsx` — comprehensive Home rework:
  1. `Library` → `Exercise Library`; `Log` → `Log Workout`; icon `notebook-outline` → `notebook-edit-outline`.
  2. Hero empty title → `Create Your Workout Plan`.
  3. Real avatar from `profile.avatarUri` via `expo-image`, with the original person icon as fallback.
  4. Quick stats now derived from the shared `sessions` array (totals match History/Calendar exactly); falls back to `profile.stats` only while the first snapshot is in flight.
  5. Loading screen (`ActivityIndicator`) shown while `!hydrated || (historyLoading && sessions.length === 0)` — eliminates the empty-state flash on cold start.
  6. New `Complete Onboarding` CTA card under the hero when no plan exists.
  7. New `Next workout preview` card showing exercise count, top 2 exercise names, estimated minutes, and up to 3 muscle-focus pills. Renders only when a plan exists and today's session isn't done.
- `Fit/app/workout/start.tsx` — empty-state copy: title `No plan yet`, meta `Complete onboarding to generate your plan.` (removes the duplicate `Generate your plan` wording shared with Home).
- `Fit/app/workout/day/[day].tsx` — added `useUserProfile` and `computeDayNumber`. Computes `isToday` from `dayNum === ((computeDayNumber(planStartDate) - 1) % plan.days.length) + 1` and passes it into `PlanDayView`. Banner label now reads `Today` only when actually today, else `Plan Day`. Section title now reads `Today's exercises` only when actually today, else `Plan day exercises`. Fallback (no-plan) header now reads `Plan Day {dayNum}`.
- `Fit/app/workout/log.tsx` — persistence fix + unit handling + KeyboardAvoidingView:
  - Per-exercise log now includes `rpe` always and `weightKg` when the user entered a positive number; conditional spread avoids writing `undefined` (Firestore client doesn't have `ignoreUndefinedProperties` on).
  - `notes` added at the session level (top of payload) only when non-empty.
  - Weight converted from `lb` → `kg` at the input boundary using factor `0.45359237`, rounded to 2 decimals.
  - Field label is now `Weight ({unit})` reading `profile.weightUnit ?? 'kg'`.
  - Success Alert text now uses the user's unit instead of hardcoded `kg`.
  - Whole `ScrollView` wrapped in `KeyboardAvoidingView` (`behavior='padding'` on iOS).
- `Fit/components/weigh-in-modal.tsx` — dynamic `Weight ({unit})` label; lb-aware validation range (55–880 lb vs 25–400 kg) with localized error message; converts input lb → kg before calling `recordWeight` so `profile.weightKg` stays canonical; initial input value also converted from stored kg → display unit.

**Status:** TypeScript clean (`npx tsc --noEmit` exit 0). Lint clean (0 errors; only the same pre-existing unused-import warning in `app/onboarding/weight.tsx` carried over from prior cycles).

---

## What you still need to do manually

1. **Deploy the new rules + Cloud Function:**
   ```bash
   firebase deploy --only firestore:rules,functions
   ```
   The new `delete_account` function and the rewritten rules are required for the gamification + account-deletion flows to work.

2. **(Optional) Create a separate prod Firebase project** and put its config into `Fit/.env.production`. Dev keeps working via the fallback values in `lib/firebase.ts`.

3. **(Optional) Wire up Sentry** when you have a DSN: `npm install @sentry/react-native`, set `EXPO_PUBLIC_SENTRY_DSN`, then swap the body of `lib/observability.ts` per the inline instructions. All call sites already go through that wrapper — zero other edits needed.

4. **Verify Maestro flows** on a real device — the YAML uses visible-text matchers, so any copy renames will need updates there.

5. **Original deploy + smoke test from Cycle 2 still applies:** sign up → onboarding → Generate My Plan → today's day card on Home → completed workout writes to Firestore → dashboard Level pill ticks up → achievement unlock alert fires on the first session.

---

## Architecture diagram

```
Onboarding screens
    ↓ (write each answer)
OnboardingContext (in-memory)
    ↓ (Generate My Plan)
    ├── updateProfile() → users/{uid} in Firestore
    └── httpsCallable('generate_plan')
            ↓
        Cloud Function (Python)
            ├── reads functions/data/exercises.json
            ├── filters by goal/level/equipment
            ├── picks N exercises × daysPerWeek
            └── writes users/{uid}/plans/{planId}
                       users/{uid}.currentPlanId
    ↓
PlanProvider (subscribes to currentPlanId)
    ↓
Home tab + day list + exercise detail + run
    └── renders images via GitHub raw URL +
        instructions/muscles from plan exercise data
```

---

## Key file paths (quick reference)

**Backend / config:**
- `Fit/lib/firebase.ts` — Firebase JS SDK init (REQUIRES YOUR CONFIG)
- `Fit/functions/main.py` — Cloud Function source
- `Fit/firebase.json`, `Fit/.firebaserc`, `Fit/firestore.rules`

**Auth:**
- `Fit/lib/auth.ts`
- `Fit/contexts/auth.tsx` / `Fit/hooks/use-auth.ts`

**Onboarding:**
- `Fit/contexts/onboarding.tsx` / `Fit/hooks/use-onboarding.ts`
- `Fit/app/onboarding/*.tsx`

**Plan:**
- `Fit/types/plan.ts`
- `Fit/contexts/plan.tsx` / `Fit/hooks/use-plan.ts`

**Dataset:**
- `Fit/assets/data/exercises.json` (generated)
- `Fit/lib/exercises.ts`
- `fitness_data_project/scripts/07_export_for_app.py`
