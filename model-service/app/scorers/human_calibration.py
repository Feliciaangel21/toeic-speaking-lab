"""Analyze model-vs-human item ratings without changing live scoring.

The evaluator's item scores are deliberately kept separate from this module.
Human-rated recordings are too scarce to justify applying learned corrections
to a learner's live result until the calibration set is large enough.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any


MIN_SESSIONS_FOR_LIVE_CALIBRATION = 12

# We deliberately leave read-aloud out: its observed bias is mostly a proxy
# for pronunciation, and this installation has no pronunciation scorer yet.
LIVE_ESTIMATE_TASKS = frozenset({"describe_picture", "respond_questions", "info_response", "opinion"})


def analyze_human_ratings(payload: dict[str, Any]) -> dict[str, Any]:
    """Summarize per-task model bias from a human-rated calibration file."""

    sessions = payload.get("sessions")
    if not isinstance(sessions, list):
        raise ValueError("Calibration data must contain a sessions array")

    task_rows: dict[str, list[tuple[float, float]]] = defaultdict(list)
    usable_sessions = 0
    for session in sessions:
        if not isinstance(session, dict):
            continue
        items = session.get("items")
        if not isinstance(items, list):
            continue
        usable_items = 0
        for item in items:
            if not isinstance(item, dict):
                continue
            task = item.get("taskType")
            model = item.get("modelScore")
            human = item.get("humanScore")
            if not isinstance(task, str) or not isinstance(model, (int, float)) or not isinstance(human, (int, float)):
                continue
            task_rows[task].append((float(model), float(human)))
            usable_items += 1
        if usable_items:
            usable_sessions += 1

    by_task: dict[str, dict[str, float | int]] = {}
    for task, rows in sorted(task_rows.items()):
        model_mean = sum(model for model, _ in rows) / len(rows)
        human_mean = sum(human for _, human in rows) / len(rows)
        # Positive bias means the model is scoring more generously than people.
        model_bias = model_mean - human_mean
        by_task[task] = {
            "items": len(rows),
            "modelMean": round(model_mean, 3),
            "humanMean": round(human_mean, 3),
            "modelBias": round(model_bias, 3),
            "suggestedCorrection": round(-model_bias, 3),
        }

    return {
        "sessions": usable_sessions,
        "items": sum(len(rows) for rows in task_rows.values()),
        "minimumSessions": MIN_SESSIONS_FOR_LIVE_CALIBRATION,
        "readyForLiveUse": usable_sessions >= MIN_SESSIONS_FOR_LIVE_CALIBRATION,
        "byTask": by_task,
    }


def provisional_live_corrections(payload: dict[str, Any]) -> dict[str, float]:
    """Return per-item human corrections allowed for a session estimate.

    These corrections are intentionally aggregate-only. Individual question
    scores and their deduction evidence remain untouched so a learner never
    sees a number that contradicts the explanation beside it.
    """
    report = analyze_human_ratings(payload)
    if payload.get("status") != "provisional-live-session-estimation":
        return {}

    by_task = report.get("byTask", {})
    if not isinstance(by_task, dict):
        return {}
    corrections: dict[str, float] = {}
    for task in LIVE_ESTIMATE_TASKS:
        row = by_task.get(task)
        if not isinstance(row, dict):
            continue
        correction = row.get("suggestedCorrection")
        if isinstance(correction, (int, float)):
            corrections[task] = float(correction)
    return corrections
