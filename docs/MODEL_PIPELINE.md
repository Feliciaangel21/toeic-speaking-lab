# TOEIC Speaking evaluation pipeline

## Principle

The numerical score must come from explainable task-specific features and, later, a human-rated calibration model. A generative LLM is optional and should only convert already-computed evidence into learner-friendly Korean feedback.

## Planned components

1. **ASR** — whisper.cpp `base.en` Q5 as the first benchmark target. Compare with `tiny.en` Q5 on non-native learner speech before choosing production default.
2. **VAD / timing** — Silero VAD ONNX for speech duration, pause ratio, pause count, and long pauses.
3. **Pronunciation (Q1–2 first)** — GOPT using a GOP feature pipeline. Keep this service-side/local-worker initially because the official recipe depends on GOP/Kaldi-style preprocessing.
4. **Semantic relevance** — BGE-small-en-v1.5 for picture concepts, Q5–7 response relevance/slot coverage, and Q11 topical relevance.
5. **Q8–10 facts** — deterministic normalization and matching for time, money, room, person, event, and date. Do not use an LLM for correctness.
6. **Language features** — deterministic/rule-based grammar and lexical features first. Add a learned language-control model only if human validation shows rules are insufficient.
7. **Argument structure (Q11)** — position/reason/example/development features, starting with rules and moving to a learned classifier if needed.
8. **Calibration** — ordinal regression / LightGBM/XGBoost-style small model trained on human rubric ratings. Until this exists, all numeric item scores must be labeled experimental.
9. **Feedback LLM (optional)** — Qwen3-0.6B is the first local candidate. It receives score evidence, never raw responsibility for the score.

## Task routing

| Task | Core signals |
|---|---|
| Q1–2 Read aloud | GOPT pronunciation, fluency, prosody, completeness + VAD |
| Q3–4 Picture | ASR + BGE concept coverage + grammar/vocabulary/cohesion + fluency |
| Q5–6 Response | ASR + required slots + relevance + language control + delivery |
| Q7 Response | Q5–6 signals + reason/detail development |
| Q8–9 Information | deterministic fact accuracy + completeness + delivery |
| Q10 Information | deterministic multi-fact accuracy + completeness + delivery |
| Q11 Opinion | relevance + position/reasons/examples + development + language + delivery |

## Data contract

`src/evaluation/contracts.ts` is the canonical model-independent output contract. Save the final object in `question_attempts.score_json` and the numeric/diagnostic feature vector in `question_attempts.feature_json`.

Every result must include model version strings. This allows old recordings to be re-scored when models change.

## Integration phases

### Phase A — plumbing
- Keep recording/upload stable.
- Add ASR adapter and VAD adapter.
- Save transcript and raw features.
- No 0–200 estimate.

### Phase B — task scoring
- Add deterministic Q8–10 fact matcher.
- Add BGE semantic adapter.
- Add Q11 argument features.
- Add GOPT for Q1–2.
- Return experimental 0–3 / 0–5 item scores.

### Phase C — validation
- Human-rate learner responses with the public rubric.
- Split by speaker, never random utterance-only split.
- Measure weighted kappa, rank/Pearson correlation, and within-one-item agreement.
- Train a small ordinal calibrator per task family.

### Phase D — product score
- Only after item-level validation, calibrate the 11 item scores/features to an estimated reported range.
- UI wording remains “AI estimated” unless there is evidence supporting stronger claims.

## Acceptance gates

Do not enable estimated exam score in production until held-out-speaker validation is strong enough for the intended claim. A reasonable internal gate is weighted kappa >= 0.75 and >= 85% of item predictions within one score point, but final thresholds should be set from validation results rather than treated as an ETS requirement.
