"""Conservative, explicitly experimental session-level score estimate.

This is a presentation layer over the evaluator's normalized item scores.  It
is not an ETS conversion and must be replaced with a human-rated calibration
model when such data is available.
"""

from __future__ import annotations

from typing import Any


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


def estimate_session_score(
    *,
    raw_total: int,
    max_total: int,
    dimensions: dict[str, dict[str, float | int]],
    completed_items: int,
    total_items: int,
) -> dict[str, Any] | None:
    """Create an estimate only after every recorded item is evaluated."""
    if max_total <= 0 or completed_items <= 0 or completed_items != total_items:
        return None

    raw_ratio = _clamp01(raw_total / max_total)
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
    composite_ratio = raw_ratio if diagnostic_ratio is None else 0.72 * raw_ratio + 0.28 * diagnostic_ratio
    score = band_for_ratio(composite_ratio)

    return {
        "score": score,
        "range": [max(0, score - 10), min(200, score + 10)],
        "rawRatio": round(raw_ratio, 4),
        "diagnosticRatio": round(diagnostic_ratio, 4) if diagnostic_ratio is not None else None,
        "compositeRatio": round(composite_ratio, 4),
        "method": "coarse-item-diagnostic-bands-v1",
        "calibrationStatus": "experimental-heuristic-not-human-calibrated",
    }
