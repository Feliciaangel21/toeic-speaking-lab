from __future__ import annotations

import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx

from app.audio import convert_to_wav
from app.config import settings
from app.schemas import QuestionPayload


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseEvaluationQueue:
    def __init__(self, pipeline) -> None:
        self.pipeline = pipeline
        self.base_url = settings.supabase_url.rstrip("/")
        self.key = settings.supabase_server_key
        self.bucket = settings.supabase_storage_bucket
        self._question_cache: dict[str, dict[str, Any]] | None = None

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.key and self.bucket)

    def _headers(self, *, json_body: bool = False) -> dict[str, str]:
        headers = {"apikey": self.key}
        # New sb_secret_* keys are API keys, not JWTs, so they must not be
        # sent as Authorization: Bearer. Legacy service_role JWTs still can.
        if not self.key.startswith("sb_secret_"):
            headers["authorization"] = f"Bearer {self.key}"
        if json_body:
            headers["content-type"] = "application/json"
            headers["prefer"] = "return=minimal"
        return headers

    def _rest_get(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        response = httpx.get(
            f"{self.base_url}/rest/v1/{table}",
            headers=self._headers(),
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, list):
            raise RuntimeError(f"Unexpected Supabase response for {table}")
        return data

    def _rest_patch(self, table: str, filters: dict[str, str], payload: dict[str, Any]) -> None:
        response = httpx.patch(
            f"{self.base_url}/rest/v1/{table}",
            headers=self._headers(json_body=True),
            params=filters,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()

    def counts(self) -> dict[str, int]:
        if not self.configured:
            return {"pending": 0, "processing": 0, "completed": 0, "failed": 0}
        rows = self._rest_get(
            "question_attempts",
            {
                "select": "evaluation_status",
                "evaluation_status": "in.(pending,processing,completed,failed)",
                "order": "created_at.desc",
                "limit": "1000",
            },
        )
        result = {"pending": 0, "processing": 0, "completed": 0, "failed": 0}
        for row in rows:
            state = str(row.get("evaluation_status", ""))
            if state in result:
                result[state] += 1
        return result

    def pending_sessions(self) -> list[dict[str, Any]]:
        if not self.configured:
            raise RuntimeError("Supabase queue is not configured in model-service/.env")

        attempts = self._rest_get(
            "question_attempts",
            {
                "select": "session_id,evaluation_status,upload_status,audio_path",
                "evaluation_status": "eq.pending",
                "upload_status": "eq.uploaded",
                "audio_path": "not.is.null",
                "order": "created_at.asc",
                "limit": "1000",
            },
        )
        pending_by_session: dict[str, int] = {}
        for attempt in attempts:
            session_id = str(attempt.get("session_id") or "")
            if session_id:
                pending_by_session[session_id] = pending_by_session.get(session_id, 0) + 1

        if not pending_by_session:
            return []

        session_ids = ",".join(pending_by_session.keys())
        sessions = self._rest_get(
            "mock_sessions",
            {
                "select": "id,mode,mock_set_number,evaluation_status,created_at",
                "id": f"in.({session_ids})",
                "order": "created_at.desc",
                "limit": "500",
            },
        )
        result: list[dict[str, Any]] = []
        for session in sessions:
            session_id = str(session.get("id") or "")
            if not session_id:
                continue
            result.append({**session, "pending_count": pending_by_session.get(session_id, 0)})
        return result

    def pending_attempts(self, limit: int = 100, session_id: str | None = None) -> list[dict[str, Any]]:
        if not self.configured:
            raise RuntimeError("Supabase queue is not configured in model-service/.env")
        params = {
            "select": "id,session_id,user_id,question_id,question_number,task_type,response_duration_ms,audio_path,audio_mime_type,created_at",
            "evaluation_status": "eq.pending",
            "upload_status": "eq.uploaded",
            "audio_path": "not.is.null",
            "order": "question_number.asc,created_at.asc" if session_id else "created_at.asc",
            "limit": str(max(1, min(limit, 500))),
        }
        if session_id:
            params["session_id"] = f"eq.{session_id}"
        return self._rest_get("question_attempts", params)

    def _download_audio(self, audio_path: str, destination: Path) -> None:
        encoded = quote(audio_path, safe="/")
        response = httpx.get(
            f"{self.base_url}/storage/v1/object/authenticated/{quote(self.bucket, safe='')}/{encoded}",
            headers=self._headers(),
            timeout=120,
        )
        response.raise_for_status()
        destination.write_bytes(response.content)

    def _build_question_cache(self, bank: dict[str, Any]) -> dict[str, dict[str, Any]]:
        cache: dict[str, dict[str, Any]] = {}
        for payload in bank.get("readAloud", []):
            if not isinstance(payload, dict) or not payload.get("id"):
                continue
            qid = str(payload["id"])
            cache[qid] = {
                "id": qid,
                "taskType": "read_aloud",
                "prompt": "Read the text aloud.",
                "passage": payload.get("text"),
                "metadata": {"referenceText": payload.get("text", "")},
            }
        for payload in bank.get("pictures", []):
            if not isinstance(payload, dict) or not payload.get("id"):
                continue
            qid = str(payload["id"])
            cache[qid] = {
                "id": qid,
                "taskType": "describe_picture",
                "prompt": "Describe the picture in as much detail as you can.",
                "imageAlt": payload.get("alt"),
                "metadata": {"scene": payload.get("scene", ""), "concepts": payload.get("concepts", [])},
            }
        for payload in bank.get("interviewGroups", []):
            if not isinstance(payload, dict):
                continue
            for child in payload.get("questions", []):
                if not isinstance(child, dict) or not child.get("id"):
                    continue
                qid = str(child["id"])
                cache[qid] = {
                    "id": qid,
                    "taskType": "respond_questions",
                    "prompt": str(child.get("prompt", "")),
                    "metadata": {"slots": child.get("slots", []), "topic": payload.get("topic", "")},
                }
        for payload in bank.get("infoGroups", []):
            if not isinstance(payload, dict):
                continue
            for child in payload.get("questions", []):
                if not isinstance(child, dict) or not child.get("id"):
                    continue
                qid = str(child["id"])
                cache[qid] = {
                    "id": qid,
                    "taskType": "info_response",
                    "prompt": str(child.get("prompt", "")),
                    "information": payload.get("information"),
                    "metadata": {"expectedFacts": child.get("expectedFacts", [])},
                }
        for payload in bank.get("opinions", []):
            if not isinstance(payload, dict) or not payload.get("id"):
                continue
            qid = str(payload["id"])
            cache[qid] = {
                "id": qid,
                "taskType": "opinion",
                "prompt": str(payload.get("prompt", "")),
                "metadata": {},
            }
        return cache

    def _load_question_cache(self) -> dict[str, dict[str, Any]]:
        if self._question_cache is not None:
            return self._question_cache

        # Git-tracked banks are the scoring reference. This avoids coupling local
        # evaluation to a possibly stale optional Supabase question_bank copy.
        import json

        data_dir = Path(__file__).resolve().parents[2] / "data"
        combined_cache: dict[str, dict[str, Any]] = {}
        for filename in ("question-bank.json", "practice-question-bank.json"):
            local_bank = data_dir / filename
            if not local_bank.exists():
                continue
            payload = json.loads(local_bank.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                combined_cache.update(self._build_question_cache(payload))
        if combined_cache:
            self._question_cache = combined_cache
            return combined_cache

        # Backward-compatible fallback for older checkouts that do not include
        # model-service/data/question-bank.json.
        rows = self._rest_get(
            "question_bank",
            {"select": "id,kind,payload", "active": "eq.true", "limit": "500"},
        )
        legacy_bank: dict[str, Any] = {
            "readAloud": [],
            "pictures": [],
            "interviewGroups": [],
            "infoGroups": [],
            "opinions": [],
        }
        kind_to_section = {
            "read_aloud": "readAloud",
            "describe_picture": "pictures",
            "respond_questions_group": "interviewGroups",
            "info_response_group": "infoGroups",
            "opinion": "opinions",
        }
        for row in rows:
            section = kind_to_section.get(str(row.get("kind", "")))
            payload = row.get("payload")
            if section and isinstance(payload, dict):
                legacy_bank[section].append(payload)
        self._question_cache = self._build_question_cache(legacy_bank)
        return self._question_cache

    def question_for_attempt(self, attempt: dict[str, Any]) -> QuestionPayload:
        qid = str(attempt["question_id"])
        raw = self._load_question_cache().get(qid)
        if not raw:
            raise RuntimeError(f"Question {qid} was not found in the local evaluation question bank")
        payload = {**raw, "number": int(attempt.get("question_number") or 0) or None}
        return QuestionPayload.model_validate(payload)

    def _set_session_state(self, session_id: str, state: str, score_json: dict[str, Any] | None = None) -> None:
        payload: dict[str, Any] = {"evaluation_status": state}
        if score_json is not None:
            payload["score_json"] = score_json
        self._rest_patch("mock_sessions", {"id": f"eq.{session_id}"}, payload)

    @staticmethod
    def _dimension_summary(completed: list[dict[str, Any]]) -> dict[str, dict[str, float | int]]:
        """Aggregate diagnostic dimensions without inventing a TOEIC scaled score."""

        selectors: dict[str, tuple[str, ...]] = {
            "delivery": ("delivery",),
            "grammar": ("grammarAccuracy",),
            "vocabulary": ("vocabularyQuality",),
            "relevance": ("relevance",),
            "content": (
                "factAccuracy",
                "conceptCoverage",
                "taskCompleteness",
                "responseCompleteness",
                "taskDevelopment",
                "development",
            ),
            "pronunciation": ("pronunciationTotal", "pronunciationAccuracy"),
        }
        buckets: dict[str, list[float]] = {name: [] for name in selectors}
        for row in completed:
            score_json = row.get("score_json") or {}
            if not isinstance(score_json, dict):
                continue
            features = score_json.get("features") or {}
            if not isinstance(features, dict):
                continue
            for dimension, keys in selectors.items():
                value: float | None = None
                for key in keys:
                    raw = features.get(key)
                    if isinstance(raw, (int, float)):
                        value = max(0.0, min(1.0, float(raw)))
                        break
                if value is not None:
                    buckets[dimension].append(value)

        result: dict[str, dict[str, float | int]] = {}
        for dimension, values in buckets.items():
            if values:
                result[dimension] = {
                    "value": round(sum(values) / len(values), 4),
                    "items": len(values),
                }
        return result

    @staticmethod
    def _task_breakdown(completed: list[dict[str, Any]]) -> dict[str, dict[str, float | int]]:
        grouped: dict[str, list[float]] = {}
        for row in completed:
            score_json = row.get("score_json") or {}
            if not isinstance(score_json, dict):
                continue
            task = str(score_json.get("taskType") or "unknown")
            raw = score_json.get("rawItemScore")
            maximum = score_json.get("maxItemScore")
            if not isinstance(raw, (int, float)) or not isinstance(maximum, (int, float)) or maximum <= 0:
                continue
            grouped.setdefault(task, []).append(float(raw) / float(maximum))
        return {
            task: {"ratio": round(sum(values) / len(values), 4), "items": len(values)}
            for task, values in grouped.items()
            if values
        }

    def reconcile_session(self, session_id: str) -> None:
        rows = self._rest_get(
            "question_attempts",
            {
                "select": "question_number,evaluation_status,score_json,upload_status",
                "session_id": f"eq.{session_id}",
                "order": "question_number.asc",
            },
        )
        evaluable = [r for r in rows if r.get("evaluation_status") != "not_requested"]
        states = [str(r.get("evaluation_status", "")) for r in evaluable]
        completed = [r for r in evaluable if r.get("evaluation_status") == "completed"]

        raw_total = 0
        max_total = 0
        confidence_values: list[float] = []
        for row in completed:
            score = row.get("score_json") or {}
            if not isinstance(score, dict):
                continue
            raw_total += int(score.get("rawItemScore") or 0)
            max_total += int(score.get("maxItemScore") or (5 if row.get("question_number") == 11 else 3))
            raw_confidence = score.get("confidence")
            if isinstance(raw_confidence, (int, float)):
                confidence_values.append(max(0.0, min(1.0, float(raw_confidence))))

        summary = {
            "status": "experimental",
            "rawTotal": raw_total,
            "maxTotal": max_total,
            "rawRatio": round(raw_total / max_total, 4) if max_total else None,
            "completedItems": len(completed),
            "totalEvaluableItems": len(evaluable),
            "dimensions": self._dimension_summary(completed),
            "taskBreakdown": self._task_breakdown(completed),
            "meanItemConfidence": (
                round(sum(confidence_values) / len(confidence_values), 4)
                if confidence_values
                else None
            ),
            # Keep this explicit: no 0-200 estimate is produced until a
            # speaker-independent human-rated calibration set exists.
            "estimatedToeicScore": None,
            "calibrationStatus": "unvalidated-no-scaled-score",
            "pipeline": self.pipeline.pipeline_version,
            "updatedAt": utc_now(),
        }

        if not evaluable:
            state = "not_requested"
        elif any(s in {"pending", "processing", "waiting_for_audio"} for s in states):
            state = "processing"
        elif any(s == "failed" for s in states):
            state = "failed"
        elif all(s == "completed" for s in states):
            state = "evaluated"
        else:
            state = "pending"
        self._set_session_state(session_id, state, summary)

    def reconcile_incomplete_sessions(self) -> int:
        rows = self._rest_get(
            "mock_sessions",
            {
                "select": "id,evaluation_status",
                "evaluation_status": "in.(pending,processing,failed)",
                "order": "created_at.asc",
                "limit": "500",
            },
        )
        count = 0
        for row in rows:
            session_id = str(row.get("id") or "")
            if not session_id:
                continue
            self.reconcile_session(session_id)
            count += 1
        return count

    def process_attempt(self, attempt: dict[str, Any]) -> dict[str, Any]:
        attempt_id = str(attempt["id"])
        session_id = str(attempt["session_id"])
        audio_path = str(attempt.get("audio_path") or "")
        if not audio_path:
            raise RuntimeError("Attempt has no audio_path")

        self._rest_patch(
            "question_attempts",
            {"id": f"eq.{attempt_id}"},
            {"evaluation_status": "processing", "evaluation_error": None},
        )
        self._set_session_state(session_id, "processing")

        suffix = Path(audio_path).suffix or ".webm"
        try:
            with tempfile.TemporaryDirectory(prefix="speaking-queue-") as tmp:
                source = Path(tmp) / f"input{suffix}"
                wav = Path(tmp) / "input.wav"
                self._download_audio(audio_path, source)
                convert_to_wav(source, wav)
                question = self.question_for_attempt(attempt)
                result = self.pipeline.evaluate(
                    question,
                    wav,
                    max(1, int(attempt.get("response_duration_ms") or 1)),
                )

            self._rest_patch(
                "question_attempts",
                {"id": f"eq.{attempt_id}"},
                {
                    "transcript": result.get("transcript"),
                    "feature_json": result.get("features"),
                    "score_json": result,
                    "evaluation_status": "completed",
                    "evaluated_at": utc_now(),
                    "evaluation_error": None,
                    "evaluation_model_version": self.pipeline.pipeline_version,
                },
            )
            return {
                "ok": True,
                "attemptId": attempt_id,
                "sessionId": session_id,
                "questionNumber": attempt.get("question_number"),
            }
        except Exception as exc:
            self._rest_patch(
                "question_attempts",
                {"id": f"eq.{attempt_id}"},
                {
                    "evaluation_status": "failed",
                    "evaluated_at": utc_now(),
                    "evaluation_error": str(exc)[:1000],
                    "evaluation_model_version": self.pipeline.pipeline_version,
                },
            )
            return {
                "ok": False,
                "attemptId": attempt_id,
                "sessionId": session_id,
                "questionNumber": attempt.get("question_number"),
                "error": str(exc)[:500],
            }
        finally:
            try:
                self.reconcile_session(session_id)
            except Exception:
                pass
