# Chatbot eval harness

Measures how well a user message gets **routed to the right broad intent** — the
decision the orchestrator makes before answering. This is the baseline + lift
number that anchors the FYP defense.

## Run

```powershell
cd functions-chatbot
npm run eval                       # baseline (typo corrector OFF)
$env:CORRECTOR_ENABLED = "1"; npm run eval   # with the fuzzy corrector ON
```

It prints accuracy split into **clean / misspelled / held-out** plus the list of
misses (`expected -> predicted`). Comparing the two runs gives the
"misspelled accuracy 41% → 89%" style chart.

## Data files

- `dataset.json` — author-written phrasings. `expected` is the broad intent
  (see `src/chatbot/intentMapper.ts` `BroadIntent`). `misspelled: true` marks
  deliberately typo'd phrasings.
- `unknowns.json` — **held-out** set. Paste real phrasings exported from
  Firestore `users/{uid}/chat_unknowns` (the `message` field) with the intent
  each *should* have routed to. This set is the honest signal because it wasn't
  written by the person who authored the intent patterns. Leave `items: []` if
  you have none yet.

## Caveat (state it in the defense)

`dataset.json` is author-written, so its "clean" accuracy is mildly optimistic
(same author wrote the patterns and the tests). The `unknowns.json` held-out set
is the uncontaminated measure — prioritise filling it from real logs.
