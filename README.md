# Speaking Lab

A Korean-first TOEIC-style speaking study app with two separate banks:

- **15 Mock sets** — strict 11-question exam simulation
- **15 Practice sets** — 11-question coached sets with redo, skip, playback, Korean guidance, and model answers

The content is original and modeled on the public TOEIC Speaking task structure and timing. This project is an independent practice simulator and is not affiliated with ETS.

## Student routes

- `/` — study-app landing page
- `/test?set=1` … `/test?set=15` — Mock sets 1–15
- `/practice?set=1` … `/practice?set=15` — Practice sets 1–15
- `/dashboard` — saved test/practice history and evaluation status
- `/dashboard/session/[id]` — completed evaluation result

## Practice Mode

Practice uses a **separate 165-question bank** rather than reusing Mock Set 1:

- 30 original read-aloud passages
- 30 picture-description practice items
- 15 original Q5–7 scenarios = 45 responses
- 15 original Q8–10 information sheets = 45 responses
- 15 original Q11 opinion prompts

Each set follows the same 11-question sequence and timing as the Mock runner. Learners choose Practice Set 1–15 before starting.

Practice-only learning controls include:

- `다시 시작` while a question is running — discard the current attempt and restart the same question from its full study/prep/narration state
- `다시 풀기` after answering — restart the same question with full timers
- `건너뛰기` — move on without saving that question
- answer playback when recording is enabled
- Korean hints, useful expressions, response structure, rationale, and task-specific model answers
- Q8–10 question reveal for learning; Mock Mode keeps spoken question text hidden

Run the content QA gate:

```bash
npm run check:practice
```

See `docs/PRACTICE_SET_QA.md` for the authoring rules and inventory.

## Async evaluation

Student responses are saved first so the timed experience never waits for inference. Evaluation can be run later on the owner laptop through the local model runner:

```text
Supabase recording queue
        ↓
local runner / selected session
        ↓
Whisper + Silero + BGE + Qwen
        ↓
transcript / features / task score / feedback
        ↓
Supabase
        ↓
student dashboard → 결과 보기
```

The local runner is session-selectable. See `docs/LOCAL_INFERENCE_EXACT.md`.

Q8–10 uses a hybrid evaluator: deterministic expected-fact matching plus a constrained semantic verifier. The LLM returns evidence such as supported/missing/contradicted facts; it does not directly assign the 0–3 item score.

## Supabase

The browser uses only the Supabase project URL and publishable key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The elevated Supabase secret/service credential belongs **only** in the local model runner environment and must never be committed or exposed to browser code.

### Setup for recording upload

Recordings only reach Supabase once all three of these are done. Without them the
app silently falls back to local-only mode, and the audio is discarded on reload.

1. Put the URL and publishable key in `.env.local`, then verify with `npm run check:supabase`.
2. Run `supabase/schema.sql` in the SQL editor. This creates the tables *and* the
   private `speaking-recordings` bucket with its owner-scoped policies.
3. Make sure **Authentication → Sign In / Providers → Email** is enabled.

Learners sign in from the 로그인 panel in the landing-page header. Every RLS policy
is `to authenticated` and scoped to `auth.uid()`, so a signed-out learner still
gets the full practice experience but their recordings stay on the device only.

### Account creation needs the service-role key

New Supabase projects require email confirmation, and the confirmation mail goes
through the built-in SMTP, which is a testing service: a few messages an hour,
delivered only to team addresses. Learners never receive it, so `signUp` alone
leaves an account that can never sign in.

`/api/auth/signup` sidesteps that by creating the account already confirmed with
`SUPABASE_SERVICE_ROLE_KEY`, server-side, then letting the browser sign in
normally. **Set that variable wherever you deploy.** `.env` is gitignored, so a
host such as Vercel does not get it from the repo, and without it the route
returns 503 and the modal reports that account creation is not connected. The
route logs the missing variable name on startup of the request.

Because the route creates accounts without proving the address belongs to the
person typing it — the same position as turning confirmation off — it is
throttled to 5 attempts per address per 10 minutes. If you need real address
verification, configure custom SMTP in Supabase and drop this route.

The repo contains:

- session/attempt persistence
- private `speaking-recordings` storage path convention
- async evaluation status fields
- RLS ownership policies
- question-bank seed scripts
- Korean practice-guide seed data

To sync the static bank from an authorized local admin environment:

```bash
npm run seed:supabase
npm run seed:guides
```

`seed:supabase` now includes both Mock and Practice bank records.

## Local web development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Local evaluation

See:

- `model-service/README.md`
- `docs/LOCAL_INFERENCE_EXACT.md`
- `docs/EVALUATION_V1.md`
- `docs/MODEL_DECISIONS.md`

Model weights and local secrets are ignored by Git.
