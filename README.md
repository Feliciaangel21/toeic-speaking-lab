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
