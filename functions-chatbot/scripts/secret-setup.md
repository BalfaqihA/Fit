# Chatbot DeepSeek secret setup

Before deploying the chatbot, set the DeepSeek API key as a Firebase Functions secret. The key must NOT be checked into the repo or shipped in the client.

## 1. Generate an API key

1. Go to https://platform.deepseek.com/ and sign in (or create an account).
2. Add credit under **Top up** (a few dollars is plenty; new accounts also get a free token grant).
3. Open **API keys → Create new API key** and copy it to your clipboard.

## 2. Set the secret

From the repo root (paste the key when prompted, then press Enter):

```powershell
firebase functions:secrets:set DEEPSEEK_API_KEY
```

## 3. Verify

```powershell
firebase functions:secrets:access DEEPSEEK_API_KEY
```

The output should match the key you pasted.

## 4. Deploy

```powershell
cd functions-chatbot
npm install
firebase deploy --only "functions:chatbot,firestore:rules"
```

The `chat` callable in `src/index.ts` declares `secrets: [DEEPSEEK_API_KEY]`, so the secret is mounted into the runtime environment automatically.

## 5. Seed the knowledge base (one-time)

After the first deploy succeeds, run the knowledge-base seed script:

```powershell
# Get a service account key from Firebase Console → Project Settings →
# Service accounts → Generate new private key. Save it locally (don't commit).
$env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME/.config/fit-admin.json"

cd functions-chatbot
npx ts-node scripts/seed-knowledge.ts
```

The script is idempotent — re-runs merge instead of duplicating.

## 5b. Seed the exercise library (one-time)

The chatbot grounds plan/exercise answers in the `exercise_library` collection,
seeded from `functions/data/exercises.json`. Same service account key as step 5.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME/.config/fit-admin.json"

cd functions-chatbot
npm run seed:exercises    # or: npx ts-node scripts/seed-exercise-library.ts
```

Idempotent — keyed by dataset `id`, re-runs merge instead of duplicating. To
seed the emulator instead, set `$env:FIRESTORE_EMULATOR_HOST = "localhost:8080"`
before running.

## 6. Seed an admin test account (one-time)

To test the admin section without the bootstrap screen/secret, provision the
owner account directly. Uses the same service account key as step 5.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "$HOME/.config/fit-admin.json"

cd functions-chatbot
npx ts-node scripts/seed-admin.ts
```

This creates/updates `ahmed1.balfaqeih55@gmail.com` (password `1221304386`,
email pre-verified) and stamps the `owner` claim. Then just log in with those
credentials — **Settings → ADMIN → Admin Dashboard** appears.

The admin screens read from the Cloud Functions, so the backend must also be
deployed once (`firebase deploy --only "functions:chatbot,firestore:rules,firestore:indexes"`;
wait for indexes to show **Enabled** in the console). Re-running the script is
safe — it just resets the password and re-stamps the claim.

## Rotating the key

If you need to rotate (e.g. accidental leak):

```powershell
firebase functions:secrets:set DEEPSEEK_API_KEY      # new value
firebase functions:secrets:destroy DEEPSEEK_API_KEY --force  # revokes old versions
firebase deploy --only functions:chatbot           # picks up the new secret
```
