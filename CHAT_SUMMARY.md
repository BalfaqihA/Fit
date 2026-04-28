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

## What you still need to do manually

1. **Paste real Firebase config values** into `Fit/lib/firebase.ts` (currently has `'PASTE_FROM_FIREBASE_CONSOLE'` placeholders for apiKey, authDomain, storageBucket, messagingSenderId, appId).

2. **Enable Blaze plan** on the Firebase project (Cloud Functions requires pay-as-you-go billing; FYP-scale traffic stays inside the free tier).

3. **Deploy backend:**
   ```bash
   cd "c:/Users/89ahm/OneDrive/سطح المكتب/Final Project/Fit"
   firebase login
   firebase deploy --only functions,firestore:rules
   ```

4. **Test the full flow:**
   - Sign up → walk every onboarding screen → tap **Generate My Plan**
   - Spinner runs, routes to `/(tabs)`
   - Firestore shows `users/{uid}` populated and `users/{uid}/plans/{planId}` containing the day-by-day plan
   - Home tab → today's day. Tap a day → real exercise thumbnails. Tap an exercise → real GitHub images + real instructions.

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
