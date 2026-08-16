from __future__ import annotations

from pathlib import Path
from typing import Any

from app.providers.whisper_cpp import WhisperCppProvider
from app.providers.silero import SileroVadProvider
from app.providers.bge import BgeProvider
from app.providers.qwen import QwenProvider
from app.scorers.facts import match_expected_facts
from app.scorers.calibrator import bucket, delivery_score, info_score
from app.schemas import QuestionPayload
from app.text_features import argument_features, basic_features, lexical_recall


class EvaluationPipeline:
    pipeline_version = "toeic-hybrid-eval-v0.2-experimental"

    def __init__(self) -> None:
        self.whisper = WhisperCppProvider()
        self.vad = SileroVadProvider()
        self.bge = BgeProvider()
        self.qwen = QwenProvider()

    def provider_status(self) -> list[dict[str, Any]]:
        return [
            {"name": "asr", "version": self.whisper.version, "ready": self.whisper.ready},
            {"name": "vad", "version": self.vad.version, "ready": self.vad.ready},
            {"name": "semantic", "version": self.bge.version, "ready": self.bge.ready},
            {"name": "llm", "version": self.qwen.version, "ready": self.qwen.ready},
        ]

    def _semantic_references(self, question: QuestionPayload) -> list[str]:
        meta = question.metadata
        if question.task_type == "describe_picture":
            refs = [question.image_alt or "", str(meta.get("scene", ""))]
            concepts = meta.get("concepts", [])
            if isinstance(concepts, list):
                refs.extend(str(item) for item in concepts)
            return refs
        if question.task_type == "respond_questions":
            slots = meta.get("slots", [])
            return [question.prompt, *(str(item) for item in slots if isinstance(item, str))]
        if question.task_type == "opinion":
            return [question.prompt]
        return []

    def evaluate(self, question: QuestionPayload, wav_path: Path, duration_ms: int) -> dict[str, Any]:
        asr = self.whisper.transcribe(wav_path)
        transcript = str(asr.get("transcript", "")).strip()
        vad = self.vad.analyze(wav_path, duration_ms)
        speech_ms = int(vad.get("speechMs", duration_ms)) or duration_ms
        text = basic_features(transcript, speech_ms)
        delivery = delivery_score(vad, float(text["wpm"]))

        features: dict[str, Any] = {
            "durationMs": duration_ms,
            **text,
            "pauseRatio": vad.get("pauseRatio"),
            "pauseCount": vad.get("pauseCount"),
            "longPauseCount": vad.get("longPauseCount"),
            "delivery": delivery,
        }
        evidence: dict[str, Any] = {"strengths": [], "improvements": []}
        max_score = 5 if question.task_type == "opinion" else 3
        confidence = 0.4
        score = 0

        if question.task_type == "read_aloud":
            completeness = lexical_recall(question.passage or "", transcript)
            features["completeness"] = completeness
            combined = 0.68 * completeness + 0.32 * delivery
            score = bucket(combined, 3)
            confidence = 0.42
            evidence["improvements"].append("GOPT pronunciation scoring is not enabled yet; this result is a lexical/delivery baseline.")

        elif question.task_type == "info_response":
            raw_facts = question.metadata.get("expectedFacts", [])
            expected_facts = [str(item) for item in raw_facts] if isinstance(raw_facts, list) else []
            deterministic = match_expected_facts(expected_facts, transcript)
            verification = self.qwen.verify_facts(question.prompt, expected_facts, transcript)
            llm_payload = verification.model_dump() if verification else None
            score, confidence, components = info_score(float(deterministic["accuracy"]), llm_payload)
            features["factAccuracy"] = deterministic["accuracy"]
            features["semanticFactSupport"] = components["semanticVerifier"]
            evidence["matchedFacts"] = deterministic["matched"]
            evidence["missingFacts"] = deterministic["missing"]
            evidence["factDetails"] = deterministic["details"]
            evidence["llmVerification"] = llm_payload
            if verification and verification.korean_feedback:
                evidence["koreanFeedback"] = verification.korean_feedback

        else:
            semantic = self.bge.similarity(transcript, self._semantic_references(question))
            if semantic is not None:
                features["relevance"] = semantic
            else:
                # No embedding model yet: preserve deployability and keep confidence visibly low.
                semantic = 0.5 if transcript else 0.0
                evidence["improvements"].append("BGE semantic provider is disabled; relevance is not fully evaluated yet.")

            if question.task_type == "opinion":
                argument = argument_features(transcript)
                features.update(argument)
                length = min(1.0, int(text["wordCount"]) / 105)
                combined = 0.32 * semantic + 0.34 * float(argument["development"]) + 0.20 * delivery + 0.14 * length
                score = bucket(combined, 5)
                confidence = 0.46 if self.bge.ready else 0.28
            else:
                target_words = 50 if question.task_type == "describe_picture" else (18 if duration_ms <= 18000 else 42)
                completeness = min(1.0, int(text["wordCount"]) / max(target_words, 1))
                features["responseCompleteness"] = completeness
                combined = 0.48 * semantic + 0.30 * completeness + 0.22 * delivery
                score = bucket(combined, 3)
                confidence = 0.45 if self.bge.ready else 0.27

        if "koreanFeedback" not in evidence:
            generated = self.qwen.korean_feedback(question.task_type, question.prompt, transcript, {"score": score, "maxScore": max_score, "features": features, "evidence": evidence})
            if generated:
                evidence["koreanFeedback"] = generated

        return {
            "status": "experimental",
            "taskType": question.task_type,
            "rawItemScore": score,
            "maxItemScore": max_score,
            "confidence": round(confidence, 3),
            "transcript": transcript,
            "features": features,
            "evidence": evidence,
            "modelVersions": {
                "pipeline": self.pipeline_version,
                "asr": self.whisper.version,
                "vad": self.vad.version if self.vad.ready else "fallback-duration-only",
                "semantic": self.bge.version if self.bge.ready else "disabled",
                "feedback": self.qwen.version if self.qwen.ready else "disabled",
                "calibrator": "rule-buckets-unvalidated-v0.2",
            },
        }
