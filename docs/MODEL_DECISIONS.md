# Model decisions: pros, cons, and implementation order

This document records the initial model choices for the TOEIC Speaking practice evaluator. These are engineering choices for an **estimated practice scorer**, not claims about ETS's internal scoring system.

## 1. ASR — whisper.cpp `base.en` Q5_1

**Role:** convert each English response into a transcript and timestamps/features usable by later scorers.

**Why first:** whisper.cpp supports CPU, Apple Silicon/Metal, iOS, Android, and WebAssembly. Its official WASM example lists `base.en` at 142 MB and the Q5_1 quantized `base.en` at 57 MB. The repository also supports integer quantization.

**Pros**
- Fully local/offline inference is realistic.
- English-only model fits TOEIC Speaking.
- 57 MB quantized weight is small enough to test on ordinary laptops and potentially browser/on-device paths.
- Much easier integration than GOPT because ASR is already a complete inference pipeline.

**Cons**
- ASR errors on accented/low-proficiency speech can contaminate grammar, content, and semantic features.
- Transcript quality is not pronunciation quality; do not use ASR confidence as a pronunciation score.
- Browser model download/caching is still noticeable.

**Benchmark alternative:** `tiny.en` Q5_1 (official WASM example: 31 MB). Use it only if non-native TOEIC-style transcription remains acceptable in our own benchmark.

**Heavier alternative:** Distil-Whisper `distil-small.en`. The official model card lists 166M parameters and the repository provides a 332 MB safetensors checkpoint (665 MB FP32). It is attractive for English ASR quality/speed, but heavier than the 57 MB whisper.cpp `base.en` Q5_1 deployment target.

## 2. VAD — Silero VAD ONNX

**Role:** speech duration, pause count, long pauses, silence ratio, and speaking-time denominator for WPM.

**Pros**
- Very small. Silero's official repository describes the JIT model as around 2 MB and the current model family at roughly 260K parameters.
- Fast enough for interactive scoring; the project reports sub-millisecond processing for 30+ ms chunks on one CPU thread.
- ONNX path makes local/service integration straightforward.
- Keeps pause measurement independent from punctuation guessed by ASR.

**Cons**
- VAD only says speech/non-speech; it cannot judge whether a pause was rhetorically appropriate.
- Thresholds may need tuning for quiet speakers, microphone noise, and clipped mobile recordings.

**Decision:** use from Phase A.

## 3. Pronunciation — GOPT

**Role:** pronunciation-focused scoring, initially Q1–2 Read Aloud.

**Pros**
- Specifically built for non-native English pronunciation assessment.
- Outputs multiple relevant aspects: accuracy, fluency, prosody, completeness, plus word/phone-level information.
- Official repository reports sentence-level PCC around 0.742 on SpeechOcean762 with a public ASR/GOP setup; released models include utterance accuracy/fluency/prosody/total scores.
- The dimensions map much better to Q1–2 than a generic LLM or ASR confidence score.

**Cons**
- Integration is the hardest component: official inference depends on GOP features and the documented recipe uses Kaldi-style acoustic/GOP preprocessing.
- The official repo itself notes a reported bug in one community inference tutorial.
- SpeechOcean762 is not TOEIC Speaking, so raw GOPT outputs must be treated as features and calibrated against our own human-rated data.
- Not an ideal first browser-only component.

**Decision:** integrate behind a local/Python service boundary after ASR/VAD are stable. Start Q1–2 only; evaluate whether it adds reliable signal for spontaneous questions later.

## 4. Semantic relevance — BGE-small-en-v1.5

**Role:** topic relevance, picture concept coverage, Q5–7 slot/relevance checks, and Q11 topical relevance.

**Pros**
- Small embedding model with a permissive MIT license.
- Designed directly for embedding/similarity tasks rather than generation.
- Deterministic and cheap compared with an LLM.
- Good architectural fit: it contributes one evidence feature instead of deciding the score.

**Cons**
- High semantic similarity does not imply good grammar, pronunciation, completeness, or argument development.
- Generic embeddings may over-credit vague answers that mention related vocabulary.
- Thresholds need task-specific calibration.

**Fallback:** `all-MiniLM-L6-v2` is mature, Apache-2.0, produces sentence embeddings, and its main safetensors file is about 90.9 MB. Use it if BGE integration/runtime support is materially easier in the chosen environment.

## 5. Q8–10 correctness — deterministic fact matcher (no LLM)

**Role:** normalize and match expected times, prices, names, rooms, dates, events, and combinations from the provided information sheet.

**Pros**
- Ground truth is already known in the question bank.
- Explainable: we can show exactly which required facts were matched/missed.
- Cheap and stable.
- Avoids an LLM hallucinating that an incorrect fact is "close enough."

**Cons**
- Needs careful normalization for number words, times, currency, paraphrases, and ASR mistakes.
- Fuzzy text matching must be constrained so it does not accept wrong entities.

**Decision:** implement before any feedback LLM.

## 6. Feedback LLM — Qwen3-0.6B (optional)

**Role:** turn already-computed evidence into concise Korean learner feedback. It must **not** choose the item score.

**Pros**
- Very small for an instruction model: 0.6B class.
- Official model is Apache-2.0.
- Suitable for structured evidence -> short Korean explanation if local quality is acceptable.

**Cons**
- Small models can still hallucinate, ignore JSON constraints, or produce weak grammar explanations.
- Adds memory/download/startup cost that is unnecessary for the actual numeric scorer.
- Must never invent missing evidence or overwrite deterministic/model scores.

**Fallback:** Gemma 3 1B IT. It is a 1.0B lightweight instruction model with multilingual support, but it is larger and uses the Gemma license/gated-access workflow rather than Apache-2.0.

**Decision:** Phase D or late Phase C. Ship templated feedback first if needed.

## 7. Final calibrator — small ordinal model

**Role:** map task-specific features to human rubric item scores (0–3 for Q1–10, 0–5 for Q11).

**Pros**
- Small, fast, explainable, and easy to retrain.
- Lets us learn the actual importance of pronunciation, completeness, relevance, etc. from human labels instead of inventing weights.
- Can have separate calibrators per task family.

**Cons**
- Requires a human-rated dataset.
- Poor speaker splitting or inconsistent raters will produce misleading validation.
- A calibrated item scorer still does not automatically justify an exact 0–200 exam score.

**Decision:** this is the model we actually train first. Pretrained speech/text components remain feature extractors.

## Implementation order

1. Save/retrieve recordings reliably (already scaffolded in the app).
2. Add whisper.cpp ASR adapter.
3. Add Silero VAD adapter and persist timing features.
4. Implement deterministic Q8–10 fact scorer.
5. Add BGE semantic adapter.
6. Add Q11 argument/development features.
7. Add GOPT service for Q1–2.
8. Collect human ratings and train task-specific ordinal calibrators.
9. Add optional Qwen feedback generation.
10. Only then evaluate whether an overall estimated reported-score range is justified.

## Primary references

- whisper.cpp: https://github.com/ggml-org/whisper.cpp
- Silero VAD: https://github.com/snakers4/silero-vad
- GOPT: https://github.com/YuanGongND/gopt
- BGE small: https://huggingface.co/BAAI/bge-small-en-v1.5
- MiniLM: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- Qwen3-0.6B: https://huggingface.co/Qwen/Qwen3-0.6B
- Gemma 3 1B IT: https://huggingface.co/google/gemma-3-1b-it
- Distil-Whisper small.en: https://huggingface.co/distil-whisper/distil-small.en
