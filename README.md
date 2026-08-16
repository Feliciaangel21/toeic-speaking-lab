# Speaking Lab — TOEIC-style Speaking Simulator
## Live Supabase status

This copy is already configured for the Supabase project `gxhjwmfgavsxixhgkril`. The live database contains:

- `mock_sessions` with RLS
- `question_attempts` with RLS
- `question_bank` with public read access only for active items
- 110 question-bank records representing 170 speaking-question opportunities
- 30 read-aloud passages calibrated to roughly 89–100 words each
- 30 picture-description tasks
- 15 three-question interview groups
- 15 three-question information-provided groups
- 20 opinion prompts
- 15 fixed full mock tests with no repeated question IDs across mocks

The bank uses original content modeled on the current ETS TOEIC Speaking task structure. It does not copy official ETS questions. Runtime question generation is not required, so practice sessions do not consume LLM tokens just to obtain questions.


A prebuilt, token-free-at-runtime MVP for an independent TOEIC-style speaking practice site. It mirrors the current **task sequence and timing**, not ETS branding or copyrighted sample prompts.

## Included

- 11-question mock test runner with automatic timing and auto-advance
- Browser microphone permission + `MediaRecorder`
- Browser `speechSynthesis` narration for Q5–10 and repeated Q10
- Static original seed bank: **30 read-aloud + 30 picture + 15 interview groups (45 questions) + 15 information groups (45 questions) + 20 opinions = 170 individual question opportunities**
- Structured metadata for future scoring (reference text, expected concepts, response slots, factual answers, rubric dimensions)
- Supabase auth-ready persistence for sessions/attempts
- Local-storage fallback when Supabase is not configured
- No paid LLM/API calls
- Explicit scoring interface in `src/lib/scoring-contract.ts`; it intentionally returns `null` until a validated scorer is attached

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. It works without Supabase in local mode.

## Connect your Supabase project (2 environment variables)

In Supabase: **Project Settings → API**, copy the project URL and anon/publishable key into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Then run the contents of `supabase/schema.sql` in the Supabase SQL editor. Restart `npm run dev`.

You can verify both the connection and schema with:

```bash
npm run check:supabase
```

The home page then lets you create/sign into a Supabase Auth account. Signed-in mock attempts are stored in `mock_sessions` and `question_attempts`; signed-out attempts remain local.

## Optional: copy the static question bank to Supabase

The application **does not need this**; static questions are cheaper and faster. If you want an admin-editable DB copy, add the service-role key only to your local `.env.local` (never browser code):

```env
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Then:

```bash
npm run seed:supabase
```

This populates `question_bank` with 110 bank records (group records contain 3 questions each).

## Where to attach scoring later

Use `src/lib/scoring-contract.ts`. The intended path is:

1. Browser recording
2. Local/server Whisper transcription
3. GOPT or equivalent pronunciation features
4. Deterministic fluency + task completeness/fact matching
5. Calibrated task-level 0–3 / 0–5 model
6. Only after validation: estimated 0–200 range

Keeping this behind one interface means the front end and question bank do not need to change when you swap models.

## Important

This project is an independent practice simulator and should not present itself as an official ETS product. Do not copy official sample-question wording into the production bank. TOEIC is a registered trademark of ETS.


## Preconfigured project in this ZIP

This generated copy is already configured for Supabase project `gxhjwmfgavsxixhgkril` through `.env.local` using its public/publishable browser key. No database password is stored in the project. If you commit the project, `.env.local` is ignored by Git.

## Korean guided practice mode

Open `/practice` for the coaching version of the test. It keeps the official-style timing, but after each response it pauses on a review screen instead of immediately advancing. Practice can be run with recording or intentionally without recording.

Each item provides Korean learning support:
- `힌트`: what information to include and what to prioritize
- `가이드 표현`: reusable English phrases appropriate for the task
- `답변 틀`: a short response structure
- `왜 이렇게 답해야 하나요?`: a Korean explanation mapped to ETS's publicly released evaluation criteria
- `모범 답변`: unlocked only after the learner records an answer

The mock route `/test` intentionally hides all coaching material.

The Korean explanations are educational summaries of the public TOEIC Speaking scoring guides. The original practice answers in this project are not official ETS answers and the project is not affiliated with ETS.


## Fixed non-repeating mocks

The bank contains 15 fixed full mock tests. Across these 15 mocks, all 165 question IDs are unique: 30 read-aloud items, 30 picture-description items, 15 interview groups (45 responses), 15 information groups (45 responses), and 15 opinion prompts. Five additional opinion prompts remain available for practice mode. Read-aloud passages are audited to 89–100 words (about 95.8 words on average) and all task metadata is tagged `exam_standard` / `ETS_2025_sample_matched`.

## Evaluation implementation handoff

The model-independent evaluation scaffold lives in `src/evaluation/`.
See `docs/MODEL_PIPELINE.md`, `docs/MODEL_DECISIONS.md`, and `docs/GIT_HANDOFF.md` before integrating model runtimes. Numeric scores produced without a human-trained calibrator must remain labeled experimental.
