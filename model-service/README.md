# Speaking Lab local evaluation service

This service is designed for the **free asynchronous MVP**: students save recordings to Supabase, then you run the open-source models on your own laptop and write the results back to Supabase.

## Student flow

```text
Vercel test/practice
  -> save audio to private Supabase Storage
  -> save question_attempt with evaluation_status=pending
  -> student immediately continues/leaves
  -> dashboard shows "평가 대기 중"
```

## Your local flow

```text
http://127.0.0.1:8100/runner
  -> click "대기 중 평가 실행"
  -> local Whisper/Silero/BGE/Qwen evaluate pending audio
  -> transcript/features/score are written back to Supabase
  -> dashboard changes to "결과 보기"
```

No GPU server has to stay online. If your laptop is off, answers simply remain pending.

## V1 providers

- **ASR:** whisper.cpp `base.en`
- **VAD:** Silero VAD
- **Semantic relevance:** `BAAI/bge-small-en-v1.5` (opt-in)
- **LLM fact verifier + Korean feedback:** `Qwen/Qwen3-0.6B` (opt-in)
- **Pronunciation:** GOPT remains phase 2.

For Q8–10, Qwen is never allowed to choose the numeric score. Deterministic fact matching and Qwen's structured `supported / missing / contradicted / ambiguous` evidence are combined by the separate calibrator.

## 1. Apply the Supabase migration

Run this file once in the Supabase SQL editor:

```text
supabase/migrations/20260816_async_evaluation.sql
```

The evaluator uses the Git-tracked `model-service/data/question-bank.json` as its scoring reference, so a stale optional Supabase `question_bank` copy will not break evaluation.

## 2. Create local environment file

```bash
cp model-service/.env.example model-service/.env
```

Fill in:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
# or, for the existing legacy key:
# SUPABASE_SERVICE_ROLE_KEY=YOUR_LEGACY_SERVICE_ROLE_KEY
```

**Never put the secret/service-role key in Vercel `NEXT_PUBLIC_*` variables or commit `model-service/.env`.** It stays on your laptop only.

To use the full hybrid Q8–10 path and generated Korean feedback:

```env
ENABLE_BGE=1
ENABLE_QWEN=1
ENABLE_QWEN_FEEDBACK=1
```

You can leave those at `0` while first validating Whisper/Silero and the queue.

## 3. Build and download Whisper once

```bash
docker build -t speaking-lab-eval ./model-service

docker run --rm \
  -v "$PWD/model-service/models:/models" \
  speaking-lab-eval /service/scripts/bootstrap_models.sh
```

The model directory is excluded from Git.

## 4. Start the local evaluator

Recommended:

```bash
docker compose -f model-service/docker-compose.yml up
```

The compose file intentionally binds only to:

```text
127.0.0.1:8100
```

so the private runner is not exposed to your network.

Check:

```text
http://127.0.0.1:8100/health
```

Then open:

```text
http://127.0.0.1:8100/runner
```

and press **대기 중 평가 실행**.

## What the runner writes back

For each `question_attempts` row:

- `evaluation_status = completed | failed`
- `transcript`
- `feature_json`
- `score_json`
- `evaluated_at`
- `evaluation_error`
- `evaluation_model_version`

When every recorded item in a session is complete, the corresponding `mock_sessions.evaluation_status` becomes `evaluated`. `/dashboard` then enables **결과 보기**.

## Session-selectable local runner

For the exact owner workflow, see `../docs/LOCAL_INFERENCE_EXACT.md`. The runner at `http://127.0.0.1:8100/runner` lists pending sessions and evaluates only the session you select.

## Mock + Practice bank lookup

The local queue resolves question metadata from both `data/question-bank.json` and `data/practice-question-bank.json`. This allows the same session-selectable runner to evaluate Mock and Practice sessions without depending on a live question-bank fetch during inference.
