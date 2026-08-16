from __future__ import annotations

from pathlib import Path
from typing import Any

from app.config import settings


class SileroVadProvider:
    version = "silero-vad-pip/onnx"

    def __init__(self) -> None:
        self._model = None
        self._api: tuple[Any, Any] | None = None

    @property
    def ready(self) -> bool:
        if not settings.enable_silero:
            return False
        try:
            import silero_vad  # noqa: F401
            return True
        except Exception:
            return False

    def _load(self) -> tuple[Any, Any, Any]:
        if self._model is None:
            from silero_vad import load_silero_vad, read_audio, get_speech_timestamps
            self._model = load_silero_vad(onnx=True)
            self._api = (read_audio, get_speech_timestamps)
        assert self._api is not None
        return self._model, self._api[0], self._api[1]

    def analyze(self, wav_path: Path, duration_ms: int) -> dict[str, Any]:
        if not self.ready:
            return {
                "speechMs": duration_ms,
                "silenceMs": 0,
                "pauseCount": 0,
                "longPauseCount": 0,
                "pauseRatio": 0.0,
                "segments": [],
            }

        model, read_audio, get_speech_timestamps = self._load()
        wav = read_audio(str(wav_path), sampling_rate=16000)
        segments = get_speech_timestamps(wav, model, sampling_rate=16000, return_seconds=True)
        speech_seconds = sum(max(0.0, float(seg["end"]) - float(seg["start"])) for seg in segments)
        pauses: list[float] = []
        for previous, current in zip(segments, segments[1:]):
            gap = max(0.0, float(current["start"]) - float(previous["end"]))
            if gap >= 0.25:
                pauses.append(gap)
        speech_ms = round(speech_seconds * 1000)
        silence_ms = max(0, duration_ms - speech_ms)
        return {
            "speechMs": speech_ms,
            "silenceMs": silence_ms,
            "pauseCount": len(pauses),
            "longPauseCount": sum(1 for gap in pauses if gap >= 1.0),
            "pauseRatio": silence_ms / max(duration_ms, 1),
            "segments": segments,
        }
