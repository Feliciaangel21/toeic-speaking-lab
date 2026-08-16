#!/usr/bin/env bash
set -euo pipefail

ROOT="${WHISPER_CPP_DIR:-/opt/whisper.cpp}"
MODEL_DIR="${MODEL_DIR:-/models}"
MODEL_NAME="${WHISPER_MODEL_NAME:-base.en}"
mkdir -p "$MODEL_DIR"

if [ ! -x "$ROOT/build/bin/whisper-cli" ]; then
  echo "whisper-cli was not found at $ROOT/build/bin/whisper-cli" >&2
  echo "Build the Docker image or set WHISPER_CPP_DIR to a whisper.cpp checkout." >&2
  exit 1
fi

if [ ! -f "$MODEL_DIR/ggml-${MODEL_NAME}.bin" ]; then
  "$ROOT/models/download-ggml-model.sh" "$MODEL_NAME" "$MODEL_DIR"
fi

echo "Whisper model ready: $MODEL_DIR/ggml-${MODEL_NAME}.bin"
echo "BGE and Qwen use Hugging Face cache on first enable/load; their weights are intentionally not committed to Git."
