# Evaluation V1 implementation plan

## Status

This repository now contains a deploy-safe evaluation connection and a separate `model-service/`. The model service is **experimental** until a speaker-independent human-rated calibration set is collected.

The Vercel app does not bundle model weights. The only Vercel-facing connection is `POST /api/evaluate`, which resolves the question server-side and forwards the recording to `MODEL_SERVICE_URL`.

## Why the scorer is separate

- model downloads cannot break the exam UI;
- Whisper/Qwen/BGE can run on a CPU/GPU host independently of Vercel;
- the test runner stays unchanged while model versions are benchmarked;
- correct-answer metadata for Q8–10 is loaded on the server rather than exposed as the scoring authority in browser code.

## Approved V1 stack

| Job | V1 model / method | Role |
| --- | --- | --- |
| ASR | whisper.cpp `base.en` | transcript |
| Speech / pauses | Silero VAD ONNX | speech duration, pause ratio, long pauses |
| Semantic relevance | BGE-small-en-v1.5 | Q3–7 and Q11 relevance feature |
| Q8–10 facts | deterministic matcher | high-precision literal/entity evidence |
| Q8–10 paraphrases | Qwen3-0.6B | constrained supported/missing/contradicted/ambiguous verification |
| Korean feedback | Qwen3-0.6B | explanation from already-computed evidence |
| Pronunciation | GOPT, phase 2 | Q1–2 pronunciation/fluency/prosody/completeness |
| Final calibration | human-rated ordinal model | replace rule buckets before TOEIC-like range display |

## Q8–10 contract

Qwen is never asked `give a TOEIC score`.

Input:

```json
{
  "question": "When does the workshop begin?",
  "referenceFacts": ["Tuesday", "2:30 PM", "Conference Room B"],
  "studentTranscript": "It starts Tuesday at half past two in room B."
}
```

Verifier output:

```json
{
  "supported": ["Tuesday", "2:30 PM", "Conference Room B"],
  "missing": [],
  "contradicted": [],
  "ambiguous": [],
  "answer_complete": true,
  "confidence": 0.94,
  "korean_feedback": "핵심 일정 정보를 모두 정확하게 전달했어요."
}
```

The rule/calibration layer converts evidence to an experimental 0–3 item score.

## Rollout gates

### Gate A — integration

- [x] Next.js server route prepared
- [x] model service health endpoint
- [x] Whisper provider wrapper
- [x] Silero provider wrapper
- [x] BGE provider wrapper
- [x] Qwen constrained verifier
- [x] deterministic Q8–10 matcher
- [ ] deploy model service host
- [ ] set `MODEL_SERVICE_URL` / `MODEL_SERVICE_TOKEN` in Vercel

### Gate B — model benchmark

Use at least 100 recordings from non-native English speakers. Compare `tiny.en-q5_1`, `base.en-q5_1`, and `base.en` for transcription accuracy and latency. Keep the model version in every `score_json`.

### Gate C — human calibration

Collect 300–500 rated responses first, with two human raters where possible. Split by speaker, not by recording. Evaluate QWK, Spearman/Pearson, and within-one-item accuracy. Only after this gate should the UI display an estimated TOEIC Speaking range.

### Gate D — pronunciation

Add GOPT to Q1–2 after the base pipeline is stable. Until then read-aloud numeric results must stay marked `experimental` because lexical coverage and pause features are not a replacement for pronunciation assessment.
