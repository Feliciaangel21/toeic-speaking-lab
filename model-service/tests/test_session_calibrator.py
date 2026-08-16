from app.scorers.session_calibrator import band_for_ratio, estimate_session_score


def test_band_boundaries_include_requested_middle_bands():
    assert band_for_ratio(0.64) == 140
    assert band_for_ratio(0.71) == 150
    assert band_for_ratio(0.78) == 160


def test_estimate_requires_all_items_to_finish():
    assert estimate_session_score(
        raw_total=20,
        max_total=30,
        dimensions={},
        completed_items=10,
        total_items=11,
    ) is None


def test_estimate_uses_item_scores_and_diagnostics():
    result = estimate_session_score(
        raw_total=24,
        max_total=30,
        dimensions={"delivery": {"value": 0.80, "items": 11}},
        completed_items=11,
        total_items=11,
    )
    assert result is not None
    assert result["score"] == 160
    assert result["range"] == [150, 170]
    assert result["calibrationStatus"] == "experimental-heuristic-not-human-calibrated"
