# Run local inference

Run this from the repository root whenever you want to evaluate uploaded
speaking answers on this computer:

```bash
./model-service/scripts/run_local_evaluator.sh
```

When it says **Local evaluator is ready**, open:

```text
http://127.0.0.1:8100/runner
```

Choose the pending session and click **대기 중 평가 실행**. Keep the terminal
window open until the evaluation finishes. The result is written back to the
dashboard automatically.

## First run, or after model-service code changes

Use the same command with `--build`:

```bash
./model-service/scripts/run_local_evaluator.sh --build
```

The first run takes longer because Docker builds the image and downloads model
files. Later runs use the files already on your computer.

## Stop it when you are done

```bash
docker compose -f model-service/docker-compose.yml stop
```

Your models and evaluated results are kept. Starting the normal command again
continues from where you left off.

## If it does not start

```bash
docker compose -f model-service/docker-compose.yml logs --tail=80 evaluation
```

Do not share or commit `model-service/.env`; it contains your private Supabase
server key.
