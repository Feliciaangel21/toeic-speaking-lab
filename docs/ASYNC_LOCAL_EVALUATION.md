# Async local evaluation workflow

## Why this architecture

The MVP should not require a paid always-on inference server. Audio is persisted first, and evaluation happens later on the project owner's laptop.

```text
STUDENT
Browser -> Vercel -> Supabase Storage + DB -> "답변 저장 완료"

OWNER
Local runner -> Supabase pending queue + Git-tracked question bank -> local open-source models -> Supabase results

STUDENT
/dashboard -> "결과 보기"
```

## Routes

### Student

- `/dashboard` — lists saved sessions and evaluation state.
- `/dashboard/session/[id]` — result page after evaluation completes.

### Local-only owner route

- `http://127.0.0.1:8100/runner` — one-button local evaluation console.
- `GET /v1/jobs/status` — queue + local batch state.
- `POST /v1/jobs/start` — starts processing pending answers in a background task.

The runner route is part of the Python model service, not Vercel. A hosted Vercel function cannot call `localhost` on the owner's laptop.

## Session states

```text
pending -> processing -> evaluated
                      -> failed
```

Attempt states:

```text
waiting_for_audio -> pending -> processing -> completed
                                      -> failed
```

## Security

The browser uses the Supabase publishable key and RLS. The local evaluator uses the Supabase service-role key because it needs to read private Storage objects and write model results. That service-role key lives only in `model-service/.env` on the owner's laptop.

## Q8–10

The local pipeline runs:

```text
Whisper transcript
  + deterministic expected-fact matcher
  + Qwen structured semantic verifier
  -> separate rule/calibration layer
  -> experimental 0–3 item score
```

Qwen cannot directly choose the 0–3 score.
