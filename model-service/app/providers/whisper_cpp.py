from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from app.config import settings


class WhisperCppProvider:
    version = "whisper.cpp-v1.9.1/base.en"

    @property
    def ready(self) -> bool:
        return settings.whisper_ready

    def transcribe(self, wav_path: Path) -> dict[str, Any]:
        if not self.ready:
            raise RuntimeError("whisper.cpp binary/model is not ready")

        with tempfile.TemporaryDirectory(prefix="wsp-") as tmp:
            output_base = Path(tmp) / "transcript"
            command = [
                settings.whisper_bin,
                "-m", settings.whisper_model,
                "-f", str(wav_path),
                "-l", "en",
                "-t", str(settings.whisper_threads),
                "-ojf",
                "-of", str(output_base),
                "-np",
            ]
            completed = subprocess.run(command, capture_output=True, text=True, timeout=120)
            if completed.returncode != 0:
                raise RuntimeError(f"whisper.cpp failed: {completed.stderr.strip()[:1000]}")

            json_path = output_base.with_suffix(".json")
            if not json_path.exists():
                return {"transcript": completed.stdout.strip(), "words": []}

            payload = json.loads(json_path.read_text(encoding="utf-8"))
            transcript = ""
            words: list[dict[str, Any]] = []
            if isinstance(payload.get("transcription"), list):
                parts: list[str] = []
                for segment in payload["transcription"]:
                    text = str(segment.get("text", "")).strip()
                    if text:
                        parts.append(text)
                    offsets = segment.get("offsets") or {}
                    if text:
                        words.append({
                            "text": text,
                            "startMs": offsets.get("from"),
                            "endMs": offsets.get("to"),
                        })
                transcript = " ".join(parts).strip()
            elif isinstance(payload.get("text"), str):
                transcript = payload["text"].strip()
            return {"transcript": transcript, "words": words, "language": "en"}
