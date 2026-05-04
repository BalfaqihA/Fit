# FitLife Chatbot — Cloud Function

Intent-classifier chatbot for the FitLife app. Trained with `@tensorflow/tfjs`,
preprocessed with `natural`, deployed as a Firebase v2 callable.

## Files

```
src/
  intents.json     # training data (patterns + responses + thresholds)
  preprocess.ts    # tokenize + stem + synonym normalization + vectorize
  train.ts         # offline training script (npm run train)
  overrides.ts     # rule-based safety overrides (run before ML)
  personalize.ts   # fills {firstName}, {todayFocus}, {level}, etc.
  index.ts         # the `chat` callable entrypoint
model/             # output of `npm run train` — committed
  model.json
  weights.bin
  vocab.json       # { vocab, intents, threshold, softThreshold, hardThreshold }
```

## Retraining workflow

After editing `src/intents.json`, `src/preprocess.ts`, or any synonym/override
list, retrain and redeploy:

```powershell
cd functions-chatbot
npm run train
git add model/ src/
git commit -m "retrain chatbot model"
firebase deploy --only functions:chatbot
```

The model files in `model/` **must** be committed — they ship with the deploy.

## Intents file format

```json
{
  "softThreshold": 0.40,
  "hardThreshold": 0.70,
  "intents": [
    {
      "tag": "greeting",
      "patterns": ["hi", "hello", "hey", ...],
      "responses": ["Hey {firstName}! Ready to train?", ...]
    }
  ]
}
```

**Intents with empty `patterns`** are never trained on. They're picked by code:
- `unknown_fallback` — used when confidence < `softThreshold`.
- `affirmation_after_<X>` / `negation_after_<X>` — used when the previous
  user turn was intent `<X>` and the current message is a yes/no.

## Confidence tiers

| Confidence | Outcome |
|---|---|
| `>= hardThreshold` (0.70) | Use the predicted intent's response |
| `softThreshold ≤ c < hard` | "Did you mean X or Y?" using top-2 predictions |
| `< softThreshold` (0.40) | `unknown_fallback` + log to `users/{uid}/chat_unknowns` |

## Placeholders

`personalize.ts` fills these (read-only Firestore lookups):

| Placeholder | Source |
|---|---|
| `{firstName}` | `users/{uid}.displayName` (first word) |
| `{todayFocus}` | `users/{uid}/plans/{currentPlanId}.days[N].title` |
| `{todayExerciseCount}` | `...days[N].exercises.length` |
| `{level}` | `floor(stats.totalXp / 1000) + 1` |
| `{totalWorkouts}` | `users/{uid}.stats.totalWorkouts` |
| `{streak}` | computed from recent `users/{uid}/workouts` |
| `{weeklyMinutes}` | sum of `durationMin` from last 7 days |
| `{daysPerWeek}` | `users/{uid}.daysPerWeek` |
| `{goal}` | `users/{uid}.primaryGoal` (mapped to label) |
| `{equipment}` | `users/{uid}.equipment` |

Missing fields fall back to safe defaults — they never break a reply.

## Reviewing logged unknowns

When confidence is below `softThreshold`, the function writes the message to
`users/{uid}/chat_unknowns/{autoId}`:

```
{ message, predictedIntent, confidence, createdAt }
```

Periodically review these in the Firestore console, add good examples to
`src/intents.json` under the right intent (or as a new intent), then retrain.

## Deploy

```powershell
firebase deploy --only functions:chatbot
```

Only the Node codebase deploys — the existing Python `generate_plan` is
untouched.
