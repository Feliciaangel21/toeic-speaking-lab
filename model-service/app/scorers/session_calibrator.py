"""Conservative, explicitly experimental session-level score estimate.

This is a presentation layer over the evaluator's normalized item scores.  It
is not an ETS conversion and must be replaced with a human-rated calibration
model when such data is available.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.scorers.human_calibration import provisional_live_corrections


# The product presents TOEIC Speaking-style ten-point score bands.  These are
# deliberately coarse: an item-score ratio cannot justify a more precise
# number until it has been calibrated against independently human-rated tests.
SCORE_BANDS: tuple[tuple[float, int], ...] = (
    (0.00, 60),
    (0.20, 80),
    (0.32, 100),
    (0.42, 110),
    (0.50, 120),
    (0.57, 130),
    (0.64, 140),
    (0.71, 150),
    (0.78, 160),
    (0.84, 170),
    (0.90, 180),
    (0.96, 190),
    (1.00, 200),
)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def band_for_ratio(ratio: float) -> int:
    """Return the highest coarse band whose threshold has been met."""
    clean = _clamp01(ratio)
    result = SCORE_BANDS[0][1]
    for threshold, score in SCORE_BANDS:
        if clean >= threshold:
            result = score
        else:
            break
    return result


@lru_cache(maxsize=1)
def _live_task_corrections() -> dict[str, float]:
    """Load the explicitly opted-in aggregate calibration data once."""
    source = Path(__file__).resolve().parents[2] / "data" / "human-calibration.json"
    try:
        payload = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return provisional_live_corrections(payload) if isinstance(payload, dict) else {}


def adjusted_total_for_tasks(
    task_totals: dict[str, dict[str, float | int]],
) -> tuple[float | None, dict[str, float]]:
    """Apply aggregate corrections without changing any item-level result."""
    corrections = _live_task_corrections()
    if not corrections or not task_totals:
        return None, {}

    total = 0.0
    applied: dict[str, float] = {}
    for task, values in task_totals.items():
        raw = values.get("rawTotal")
        maximum = values.get("maxTotal")
        items = values.get("items")
        if not isinstance(raw, (int, float)) or not isinstance(maximum, (int, float)) or not isinstance(items, (int, float)):
            continue
        correction = corrections.get(task, 0.0) * float(items)
        total += max(0.0, min(float(maximum), float(raw) + correction))
        if correction:
            applied[task] = round(correction, 3)

    return total, applied


def estimate_session_score(
    *,
    raw_total: int,
    max_total: int,
    dimensions: dict[str, dict[str, float | int]],
    completed_items: int,
    total_items: int,
    task_totals: dict[str, dict[str, float | int]] | None = None,
) -> dict[str, Any] | None:
    """Create an estimate only after every recorded item is evaluated."""
    if max_total <= 0 or completed_items <= 0 or completed_items != total_items:
        return None

    raw_ratio = _clamp01(raw_total / max_total)
    adjusted_total, applied_corrections = adjusted_total_for_tasks(task_totals or {})
    calibrated_ratio = _clamp01(adjusted_total / max_total) if adjusted_total is not None else raw_ratio
    diagnostic_values = [
        _clamp01(float(value["value"]))
        for value in dimensions.values()
        if isinstance(value, dict) and isinstance(value.get("value"), (int, float))
    ]
    diagnostic_ratio = (
        sum(diagnostic_values) / len(diagnostic_values) if diagnostic_values else None
    )
    # Item scores remain the primary signal.  Diagnostics gently adjust the
    # band when delivery, language, relevance, and content consistently agree.
    composite_ratio = calibrated_ratio if diagnostic_ratio is None else 0.72 * calibrated_ratio + 0.28 * diagnostic_ratio
    score = band_for_ratio(composite_ratio)

    return {
        "score": score,
        "range": [max(0, score - 10), min(200, score + 10)],
        "rawRatio": round(raw_ratio, 4),
        "calibratedItemRatio": round(calibrated_ratio, 4),
        "diagnosticRatio": round(diagnostic_ratio, 4) if diagnostic_ratio is not None else None,
        "compositeRatio": round(composite_ratio, 4),
        "method": "coarse-item-diagnostic-bands-v1-human-task-adjusted" if applied_corrections else "coarse-item-diagnostic-bands-v1",
        "taskCorrections": applied_corrections,
        "calibrationStatus": "provisional-human-adjusted-6-sessions" if applied_corrections else "experimental-heuristic-not-human-calibrated",
    }
