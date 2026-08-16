# Inference Pipeline v0.3 — Enriched Local Analysis

This patch keeps the existing architecture:

```text
Vercel browser -> Supabase recording queue -> local model-service -> Supabase -> dashboard
```

No model inference is moved to Vercel. The laptop can remain off while recordings accumulate in Supabase.

## What changed

### 1. Structured language analysis

For Q3–Q11 (except read-aloud language correction), Qwen now returns structured evidence rather than only prose feedback:

- `grammarAccuracy`
- `vocabularyQuality`
- `clarity`
- `directAnswer`
- `taskCompleteness`
- `taskDevelopment`
- exact grammar corrections
- exact vocabulary/word-choice corrections
- reusable better expressions
- supported/missing task points
- specific strengths/improvements
- Korean feedback

The prompt explicitly forbids Qwen from assigning an official TOEIC score or the 0–3/0–5 item score. The deterministic/rule scoring layer remains the final numeric authority.

### 2. Richer task-specific scoring evidence

- **Q1–2:** keeps lexical completeness + delivery fallback, with a real pronunciation adapter hook.
- **Q3–4:** adds structured picture-concept coverage + grammar/vocabulary/clarity evidence.
- **Q5–7:** adds direct-answer and requested-information completeness evidence.
- **Q8–10:** keeps deterministic + constrained semantic fact verification as the content authority; language analysis is added for dashboard feedback but does not override the fact score.
- **Q11:** combines semantic relevance, argument development, directness, delivery and language-quality evidence.

All item scores remain marked `experimental`.

### 3. Vocabulary diagnostics

Deterministic text features now also include:

- unique word count
- lexical diversity
- normalized root-TTR diagnostic
- content-word ratio
- content lexical diversity

These are diagnostics, not official TOEIC criteria by themselves.

### 4. Pronunciation adapter

Whisper transcript accuracy is **not** treated as pronunciation quality.

A new optional `PronunciationProvider` calls a local command configured by:

```env
ENABLE_PRONUNCIATION=1
PRONUNCIATION_COMMAND=/absolute/path/to/your-pronunciation-adapter
```

The command receives this JSON on stdin:

```json
{
  "wav_path": "/tmp/input.wav",
  "reference_text": "The passage the learner was asked to read."
}
```

It must return JSON on stdout:

```json
{
  "accuracy": 0.82,
  "completeness": 0.91,
  "fluency": 0.74,
  "prosody": 0.68,
  "total": 0.79,
  "word_scores": [],
  "provider": "gopt-local",
  "experimental": true
}
```

The official GOPT research implementation is not bundled in this patch because its own-audio path requires GOP/ASR feature extraction. The adapter boundary prevents the main evaluator from becoming coupled to a research repo or falsely claiming pronunciation scoring when the required acoustic pipeline is absent.

If the adapter is disabled or fails, Q1–2 falls back safely to the existing lexical-completeness + delivery baseline and stores `pronunciationStatus: "unavailable"`.

### 5. Session-level analysis

When a session reconciles, `mock_sessions.score_json` now also stores:

```json
{
  "dimensions": {
    "delivery": { "value": 0.78, "items": 11 },
    "grammar": { "value": 0.74, "items": 9 },
    "vocabulary": { "value": 0.76, "items": 9 },
    "relevance": { "value": 0.84, "items": 6 },
    "content": { "value": 0.81, "items": 9 }
  },
  "taskBreakdown": {
    "describe_picture": { "ratio": 0.67, "items": 2 }
  },
  "meanItemConfidence": 0.61,
  "estimatedToeicScore": null,
  "calibrationStatus": "unvalidated-no-scaled-score"
}
```

No fake 0–200 score is generated. A scaled TOEIC-like estimate should only be added after human-rated calibration.

## Dashboard additions

The existing session result page now reads the richer data and shows, when available:

- session dimension averages
- grammar and vocabulary diagnostics
- exact correction pairs
- better expressions
- supported/missing task points
- picture concept coverage
- pronunciation result, or an explicit unavailable notice

No database migration is required because the new fields live inside the existing `feature_json` and `score_json` JSON columns.

## Recommended local env

```env
ENABLE_SILERO=1
ENABLE_BGE=1
ENABLE_QWEN=1
ENABLE_QWEN_FEEDBACK=1
ENABLE_QWEN_LANGUAGE_ANALYSIS=1

# leave off until a real pronunciation adapter is configured
ENABLE_PRONUNCIATION=0
```

## Validation included in this patch

- Python syntax compilation for all modified/new model-service files
- unit tests for lexical diagnostics and Qwen JSON helpers
- simulated pipeline integration for picture, information-response and read-aloud paths
- simulated session aggregation test

Existing already-evaluated sessions will not magically gain the new evidence. Re-evaluate a test session if you want to inspect the enriched dashboard output on old recordings.
