# Async evaluation handoff — 2026-08-16

## What changed

The project now uses a **save-first / evaluate-later** workflow.

### Student

1. Completes a mock/practice recording.
2. Browser uploads audio to private `speaking-recordings` Storage.
3. Browser inserts a `question_attempts` row with `evaluation_status = pending`.
4. Student immediately sees **답변 저장 완료** and can continue studying or leave.
5. `/dashboard` shows the saved session as **평가 대기 중**.
6. After local evaluation finishes, `/dashboard` changes to **결과 보기**.

### Owner

1. Start the local Docker model service.
2. Open `http://127.0.0.1:8100/runner`.
3. Click **대기 중 평가 실행** once.
4. The runner pulls pending private recordings from Supabase, evaluates them locally, and writes results back.

## Routes added

- `/dashboard`
- `/dashboard/session/[id]`
- local `http://127.0.0.1:8100/runner`
- local `GET /v1/jobs/status`
- local `POST /v1/jobs/start`

The existing `/api/evaluate` route remains for a possible future hosted model service, but it is not required by the free local batch workflow.

## Supabase

The live project schema was updated on 2026-08-16 with the additive queue fields from:

```text
supabase/migrations/20260816_async_evaluation.sql
```

The migration is still committed so another environment can reproduce the schema.

Browser database access remains **insert + read only** for the student's own sessions/attempts. The browser no longer needs UPDATE permission: audio is uploaded first, then the final attempt row is inserted once with its Storage path. Model result updates are performed only by the trusted local worker.

## Question bank

The local evaluator uses:

```text
model-service/data/question-bank.json
```

This contains the expanded 170 opportunities and all 165 unique questions used across the 15 full mock sets. It does not depend on the optional Supabase `question_bank` being perfectly synchronized.

## Local setup

```bash
cp model-service/.env.example model-service/.env
```

Fill in the Supabase URL and a server-only Supabase secret/service-role key. Never expose that key to Vercel browser variables or Git.

For the full hybrid pipeline:

```env
ENABLE_BGE=1
ENABLE_QWEN=1
ENABLE_QWEN_FEEDBACK=1
```

Build/download/start:

```bash
docker build -t speaking-lab-eval ./model-service

docker run --rm \
  -v "$PWD/model-service/models:/models" \
  speaking-lab-eval /service/scripts/bootstrap_models.sh

docker compose -f model-service/docker-compose.yml up
```

Then open:

```text
http://127.0.0.1:8100/runner
```

The Compose port is intentionally bound to localhost only.

## Result status

Session:

```text
pending -> processing -> evaluated
                      -> failed
```

Attempt:

```text
pending -> processing -> completed
                    -> failed
```

Completed attempts save:

- transcript
- feature JSON
- complete experimental score JSON
- Korean feedback when Qwen feedback is enabled
- model/pipeline version
- evaluated timestamp

The dashboard deliberately labels the current score as experimental and not an official TOEIC Speaking score.
