from __future__ import annotations

import json
import shlex
import subprocess
from pathlib import Path
from typing import Any

from app.config import settings
from app.schemas import PronunciationAssessment


class PronunciationProvider:
    """Optional adapter for a real pronunciation assessment backend.

    The current repo does not bundle GOPT because the official GOPT inference
    pipeline requires GOP/ASR feature extraction. This adapter lets you connect
    GOPT (or another local pronunciation model) without coupling the main worker
    to one research repository.
    """

    version = "external-pronunciation-adapter-v1"

    @property
    def ready(self) -> bool:
        return bool(settings.enable_pronunciation and settings.pronunciation_command.strip())

    def analyze(self, wav_path: Path, reference_text: str) -> PronunciationAssessment | None:
        if not self.ready or not reference_text.strip():
            return None

        payload = {
            "wav_path": str(wav_path),
            "reference_text": reference_text,
        }
        command = shlex.split(settings.pronunciation_command)
        if not command:
            return None

        completed = subprocess.run(
            command,
            input=json.dumps(payload, ensure_ascii=False),
            capture_output=True,
            text=True,
            timeout=settings.pronunciation_timeout_sec,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                f"pronunciation adapter failed: {completed.stderr.strip()[:1000]}"
            )

        try:
            raw: dict[str, Any] = json.loads(completed.stdout)
        except json.JSONDecodeError as exc:
            raise RuntimeError("pronunciation adapter did not return JSON") from exc

        def normalize(name: str) -> None:
            value = raw.get(name)
            if value is None:
                return
            raw[name] = max(0.0, min(1.0, float(value)))

        for key in ("accuracy", "completeness", "fluency", "prosody", "total"):
            normalize(key)
        raw.setdefault("provider", self.version)
        raw.setdefault("experimental", True)
        return PronunciationAssessment.model_validate(raw)
