#!/usr/bin/env bash
set -euo pipefail

build_image=false
if [[ "${1:-}" == "--build" ]]; then
  build_image=true
elif [[ -n "${1:-}" ]]; then
  echo "Usage: $0 [--build]" >&2
  exit 2
fi

service_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$service_dir"

if [[ ! -f .env ]]; then
  echo "Missing model-service/.env. Copy .env.example to .env and fill in the local values first." >&2
  exit 1
fi

if [[ "$build_image" == true ]]; then
  echo "Building the evaluator image…"
  docker compose up -d --build
else
  docker compose up -d
fi

for _ in {1..20}; do
  if curl -fsS http://127.0.0.1:8100/health >/dev/null; then
    echo
    echo "Local evaluator is ready."
    echo "Open http://127.0.0.1:8100/runner and click the pending session to evaluate it."
    echo "Use '$0 --build' only after changing model-service code or dependencies."
    exit 0
  fi
  sleep 2
done

echo "The evaluator did not become ready. Recent logs:" >&2
docker compose logs --tail=50 evaluation >&2
exit 1
