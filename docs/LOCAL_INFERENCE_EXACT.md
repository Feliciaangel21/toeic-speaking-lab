# Exact local inference workflow

This app uses Supabase as the queue and result store. Students only save recordings. The project owner runs inference later on a Mac/PC.

## One-time setup

1. Install and start Docker Desktop.
2. Open Terminal and enter the project model-service directory.
3. Copy the local environment template:

```bash
cp .env.example .env
```

4. Edit `.env`. Required values:

```env
SUPABASE_URL=https://gxhjwmfgavsxixhgkril.supabase.co
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
SUPABASE_STORAGE_BUCKET=speaking-recordings
ENABLE_LOCAL_RUNNER=1

ENABLE_SILERO=1
ENABLE_BGE=1
ENABLE_QWEN=1
ENABLE_QWEN_FEEDBACK=1
```

Never commit `.env` or the Supabase secret/service-role key.

5. Build the local evaluator image:

```bash
docker compose build
```

6. Download the Whisper model into the local `models/` volume:

```bash
docker compose run --rm evaluation /service/scripts/bootstrap_models.sh
```

BGE and Qwen download into `model-service/models/huggingface/` the first time they are loaded. They are cached locally afterwards.

## Every time you want to evaluate saved sessions

From `model-service/`:

```bash
docker compose up
```

Leave that Terminal window running and open:

```text
http://127.0.0.1:8100/runner
```

The page lists only sessions with pending uploaded recordings. Pick one session, for example:

```text
모의고사 1 · 11문항 · 8월 16일 오후 9:20
```

Then click:

```text
이 세션 평가 실행
```

Only that session is processed.

The worker:

1. fetches pending attempt rows for the selected session;
2. downloads those private recordings from Supabase Storage;
3. runs Whisper, Silero, BGE and Qwen locally;
4. writes transcript/features/score/feedback back to Supabase;
5. reconciles the session state to `evaluated` when all selected-session attempts finish.

Students can later open `/dashboard` and select `결과 보기` for that session.

## Stop the evaluator

Press `Ctrl+C` in the `docker compose up` Terminal, then optionally:

```bash
docker compose down
```

The model files remain cached in `model-service/models/` and do not need to be downloaded again.
