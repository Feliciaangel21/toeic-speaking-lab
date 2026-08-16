from __future__ import annotations

from typing import Any


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def delivery_score(vad: dict[str, Any], wpm: float) -> float:
    pause = float(vad.get("pauseRatio", 0.0))
    long_pauses = int(vad.get("longPauseCount", 0))
    pace = 1.0 if 105 <= wpm <= 185 else max(0.25, 1.0 - min(abs(wpm - 145) / 145, 0.75))
    return clamp(0.55 * pace + 0.45 * max(0.0, 1.0 - pause - 0.12 * long_pauses))


def bucket(value: float, max_score: int) -> int:
    value = clamp(value)
    if max_score == 3:
        if value >= 0.80:
            return 3
        if value >= 0.54:
            return 2
        if value >= 0.22:
            return 1
        return 0
    if value >= 0.86:
        return 5
    if value >= 0.70:
        return 4
    if value >= 0.52:
        return 3
    if value >= 0.34:
        return 2
    if value >= 0.16:
        return 1
    return 0


def info_score(deterministic_accuracy: float, llm: dict[str, Any] | None) -> tuple[int, float, dict[str, float]]:
    if llm:
        expected_count = max(1, len(llm.get("supported", [])) + len(llm.get("missing", [])) + len(llm.get("contradicted", [])) + len(llm.get("ambiguous", [])))
        semantic_support = (len(llm.get("supported", [])) + 0.35 * len(llm.get("ambiguous", []))) / expected_count
        combined = 0.7 * deterministic_accuracy + 0.3 * semantic_support
        contradiction_penalty = min(0.35, 0.18 * len(llm.get("contradicted", [])))
        combined = clamp(combined - contradiction_penalty)
        confidence = clamp(0.55 + 0.25 * float(llm.get("confidence", 0.0)))
    else:
        semantic_support = deterministic_accuracy
        combined = deterministic_accuracy
        confidence = 0.45
    return bucket(combined, 3), confidence, {"deterministic": deterministic_accuracy, "semanticVerifier": semantic_support, "combined": combined}
