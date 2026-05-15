# Chatbot Gemini secret setup

Before deploying the chatbot, set the Gemini API key as a Firebase Functions secret. The key must NOT be checked into the repo or shipped in the client.

## 1. Generate an API key

1. Go to https://aistudio.google.com/apikey
2. Create a key in the project that owns your Firebase billing.
3. Copy it to your clipboard.

## 2. Set the secret

From the repo root (paste the key when prompted, then press Enter):

```powershell
firebase functions:secrets:set GEMINI_API_KEY
```

## 3. Verify

```powershell
firebase functions:secrets:access GEMINI_API_KEY
```

The output should match the key you pasted.

## 4. Deploy

```powershell
cd functions-chatbot
npm install
firebase deploy --only "functions:chatbot,firestore:rules"
```

The `chat` callable in `src/index.ts` declares `secrets: [GEMINI_API_KEY]`, so the secret is mounted into the runtime environment automatically.

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

## Rotating the key

If you need to rotate (e.g. accidental leak):

```powershell
firebase functions:secrets:set GEMINI_API_KEY      # new value
firebase functions:secrets:destroy GEMINI_API_KEY --force  # revokes old versions
firebase deploy --only functions:chatbot           # picks up the new secret
```
