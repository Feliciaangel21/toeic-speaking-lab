from __future__ import annotations

import json
from pathlib import Path

from app.scorers.human_calibration import analyze_human_ratings, provisional_live_corrections


def test_seed_ratings_expose_task_specific_bias_without_enabling_live_use() -> None:
    source = Path(__file__).resolve().parents[1] / "data" / "human-calibration.json"
    result = analyze_human_ratings(json.loads(source.read_text(encoding="utf-8")))

    assert result["sessions"] == 6
    assert result["items"] == 66
    assert result["readyForLiveUse"] is False
    assert result["byTask"]["opinion"]["modelBias"] == 1.333
    assert result["byTask"]["respond_questions"]["suggestedCorrection"] == -0.778

    corrections = provisional_live_corrections(json.loads(source.read_text(encoding="utf-8")))
    assert corrections == {
        "describe_picture": -0.625,
        "info_response": 1.056,
        "opinion": -1.333,
        "respond_questions": -0.778,
    }
