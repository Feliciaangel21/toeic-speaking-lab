from __future__ import annotations

from pathlib import Path
from typing import Any

from app.providers.bge import BgeProvider
from app.providers.pronunciation import PronunciationProvider
from app.providers.qwen import QwenProvider
from app.providers.silero import SileroVadProvider
from app.providers.whisper_cpp import WhisperCppProvider
from app.schemas import LlmResponseAnalysis, QuestionPayload
from app.scorers.calibrator import bucket, delivery_score, info_score
from app.scorers.facts import match_expected_facts
from app.text_features import argument_features, basic_features, lexical_recall


class EvaluationPipeline:
    pipeline_version = "toeic-hybrid-eval-v0.3-enriched"

    def __init__(self) -> None:
        self.whisper = WhisperCppProvider()
        self.vad = SileroVadProvider()
        self.bge = BgeProvider()
        self.qwen = QwenProvider()
        self.pronunciation = PronunciationProvider()

    def provider_status(self) -> list[dict[str, Any]]:
        return [
            {"name": "asr", "version": self.whisper.version, "ready": self.whisper.ready},
            {"name": "vad", "version": self.vad.version, "ready": self.vad.ready},
            {"name": "semantic", "version": self.bge.version, "ready": self.bge.ready},
            {"name": "llm", "version": self.qwen.version, "ready": self.qwen.ready},
            {
                "name": "pronunciation",
                "version": self.pronunciation.version,
                "ready": self.pronunciation.ready,
            },
        ]

    def _semantic_references(self, question: QuestionPayload) -> list[str]:
        meta = question.metadata
        if question.task_type == "describe_picture":
            refs = [question.image_alt or "", str(meta.get("scene", ""))]
            concepts = meta.get("concepts", [])
            if isinstance(concepts, list):
                refs.extend(str(item) for item in concepts)
            return [item for item in refs if item.strip()]
        if question.task_type == "respond_questions":
            slots = meta.get("slots", [])
            slot_refs = [str(item) for item in slots if isinstance(item, str)] if isinstance(slots, list) else []
            return [question.prompt, *slot_refs]
        if question.task_type == "opinion":
            return [question.prompt]
        return []

    def _coverage_references(self, question: QuestionPayload) -> list[str]:
        """References that may safely be shown as supported/missing items."""
        meta = question.metadata
        if question.task_type == "describe_picture":
            concepts = meta.get("concepts", [])
            return [str(item) for item in concepts if str(item).strip()] if isinstance(concepts, list) else []
        if question.task_type == "respond_questions":
            slots = meta.get("slots", [])
            return [str(item) for item in slots if isinstance(item, str) and item.strip()] if isinstance(slots, list) else []
        return []

    @staticmethod
    def _clamp01(value: float) -> float:
        return max(0.0, min(1.0, value))

    @staticmethod
    def _mean_available(values: list[float | None]) -> float | None:
        clean = [float(value) for value in values if value is not None]
        return sum(clean) / len(clean) if clean else None

    def _merge_response_analysis(
        self,
        analysis: LlmResponseAnalysis | None,
        features: dict[str, Any],
        evidence: dict[str, Any],
    ) -> None:
        if analysis is None:
            return

        grammar = self._clamp01(analysis.grammar_accuracy)
        vocabulary = self._clamp01(analysis.vocabulary_quality)
        clarity = self._clamp01(analysis.clarity)
        task_completeness = self._clamp01(analysis.task_completeness)
        development = self._clamp01(analysis.development)
        language_quality = 0.60 * grammar + 0.40 * vocabulary

        features.update(
            {
                "grammarAccuracy": grammar,
                "vocabularyQuality": vocabulary,
                "clarity": clarity,
                "languageQuality": language_quality,
                "taskCompleteness": task_completeness,
                "taskDevelopment": development,
                "directAnswer": bool(analysis.direct_answer),
                "analysisConfidence": self._clamp01(analysis.confidence),
            }
        )

        evidence["grammarCorrections"] = [
            {
                "original": item.original,
                "corrected": item.corrected,
                "category": item.category,
                "explanationKo": item.explanation_ko,
            }
            for item in analysis.grammar_errors
        ]
        evidence["vocabularyIssues"] = [
            {
                "original": item.original,
                "corrected": item.corrected,
                "category": item.category,
                "explanationKo": item.explanation_ko,
            }
            for item in analysis.vocabulary_issues
        ]
        evidence["betterExpressions"] = analysis.better_expressions
        evidence["supportedPoints"] = analysis.supported_points
        evidence["missingPoints"] = analysis.missing_points
        evidence["strengths"] = analysis.strengths
        evidence["improvements"] = analysis.improvements
        if analysis.korean_feedback:
            evidence["koreanFeedback"] = analysis.korean_feedback

    def evaluate(self, question: QuestionPayload, wav_path: Path, duration_ms: int) -> dict[str, Any]:
        asr = self.whisper.transcribe(wav_path)
        transcript = str(asr.get("transcript", "")).strip()
        vad = self.vad.analyze(wav_path, duration_ms)
        speech_ms = int(vad.get("speechMs", duration_ms)) or duration_ms
        text = basic_features(transcript, speech_ms)
        delivery = delivery_score(vad, float(text["wpm"]))

        features: dict[str, Any] = {
            "durationMs": duration_ms,
            "speechMs": speech_ms,
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
        score_components: dict[str, float] = {}

        if question.task_type == "read_aloud":
            completeness = lexical_recall(question.passage or "", transcript)
            features["completeness"] = completeness
            try:
                pronunciation = self.pronunciation.analyze(wav_path, question.passage or "")
            except Exception as exc:
                pronunciation = None
                evidence["pronunciationError"] = str(exc)[:500]

            if pronunciation is not None:
                p = pronunciation.model_dump()
                for key in ("accuracy", "completeness", "fluency", "prosody", "total"):
                    value = p.get(key)
                    if value is not None:
                        features[f"pronunciation{key.title()}"] = float(value)
                evidence["pronunciation"] = p
                pron_total = pronunciation.total or self._mean_available(
                    [pronunciation.accuracy, pronunciation.fluency, pronunciation.prosody]
                )
                pron_total = float(pron_total if pron_total is not None else completeness)
                combined = 0.55 * pron_total + 0.25 * completeness + 0.20 * delivery
                score_components = {
                    "pronunciation": pron_total,
                    "textCompleteness": completeness,
                    "delivery": delivery,
                }
                score = bucket(combined, 3)
                confidence = 0.62
            else:
                combined = 0.68 * completeness + 0.32 * delivery
                score_components = {
                    "textCompleteness": completeness,
                    "delivery": delivery,
                }
                score = bucket(combined, 3)
                confidence = 0.42
                evidence["pronunciationStatus"] = "unavailable"
                evidence["improvements"].append(
                    "발음 전용 모델이 아직 연결되지 않아 현재 점수는 낭독 정확도와 전달력 기준의 실험값이야."
                )

        elif question.task_type == "info_response":
            raw_facts = question.metadata.get("expectedFacts", [])
            expected_facts = [str(item) for item in raw_facts] if isinstance(raw_facts, list) else []
            deterministic = match_expected_facts(expected_facts, transcript)
            verification = self.qwen.verify_facts(question.prompt, expected_facts, transcript)
            llm_payload = verification.model_dump() if verification else None
            score, confidence, components = info_score(float(deterministic["accuracy"]), llm_payload)
            score_components = {
                "factMatch": float(components["deterministic"]),
                "semanticFactSupport": float(components["semanticVerifier"]),
                "factCombined": float(components["combined"]),
            }
            features["factAccuracy"] = deterministic["accuracy"]
            features["semanticFactSupport"] = components["semanticVerifier"]
            evidence["matchedFacts"] = deterministic["matched"]
            evidence["missingFacts"] = deterministic["missing"]
            evidence["factDetails"] = deterministic["details"]
            evidence["llmVerification"] = llm_payload
            if verification and verification.korean_feedback:
                evidence["koreanFeedback"] = verification.korean_feedback

            # Separate language diagnostics enrich the dashboard but do not
            # override the content/fact score for Q8-10.
            analysis = self.qwen.analyze_response(
                task_type=question.task_type,
                question=question.prompt,
                transcript=transcript,
                reference_points=[],
                computed_features=features,
            )
            existing_fact_feedback = evidence.get("koreanFeedback")
            self._merge_response_analysis(analysis, features, evidence)
            if existing_fact_feedback:
                evidence["koreanFeedback"] = existing_fact_feedback

        else:
            semantic = self.bge.similarity(transcript, self._semantic_references(question))
            if semantic is not None:
                features["relevance"] = semantic
            else:
                semantic = 0.5 if transcript else 0.0
                evidence["improvements"].append(
                    "BGE 의미 유사도 모델이 꺼져 있어 관련성 평가는 보수적으로 처리됐어."
                )

            coverage_refs = self._coverage_references(question)
            analysis = self.qwen.analyze_response(
                task_type=question.task_type,
                question=question.prompt,
                transcript=transcript,
                reference_points=coverage_refs,
                computed_features=features,
            )
            self._merge_response_analysis(analysis, features, evidence)

            if question.task_type == "opinion":
                argument = argument_features(transcript)
                features.update(argument)
                length = min(1.0, int(text["wordCount"]) / 105)
                if analysis is not None:
                    development = max(float(argument["development"]), analysis.development)
                    direct = 1.0 if analysis.direct_answer else 0.0
                    language = float(features.get("languageQuality", 0.0))
                    combined = (
                        0.22 * semantic
                        + 0.28 * development
                        + 0.12 * direct
                        + 0.14 * delivery
                        + 0.14 * language
                        + 0.10 * length
                    )
                    score_components = {
                        "relevance": semantic,
                        "development": development,
                        "directAnswer": direct,
                        "delivery": delivery,
                        "languageQuality": language,
                        "length": length,
                    }
                    confidence = 0.62 if self.bge.ready else 0.52
                else:
                    combined = (
                        0.32 * semantic
                        + 0.34 * float(argument["development"])
                        + 0.20 * delivery
                        + 0.14 * length
                    )
                    score_components = {
                        "relevance": semantic,
                        "development": float(argument["development"]),
                        "delivery": delivery,
                        "length": length,
                    }
                    confidence = 0.46 if self.bge.ready else 0.28
                score = bucket(combined, 5)

            else:
                target_words = 50 if question.task_type == "describe_picture" else (18 if duration_ms <= 18000 else 42)
                response_completeness = min(1.0, int(text["wordCount"]) / max(target_words, 1))
                features["responseCompleteness"] = response_completeness

                if analysis is not None:
                    task_completeness = float(features.get("taskCompleteness", response_completeness))
                    language = float(features.get("languageQuality", 0.0))
                    clarity = float(features.get("clarity", 0.0))
                    direct = 1.0 if analysis.direct_answer else 0.0

                    if question.task_type == "describe_picture":
                        if coverage_refs:
                            concept_coverage = len(analysis.supported_points) / max(len(coverage_refs), 1)
                        else:
                            concept_coverage = task_completeness
                        features["conceptCoverage"] = concept_coverage
                        combined = (
                            0.25 * semantic
                            + 0.24 * concept_coverage
                            + 0.14 * response_completeness
                            + 0.14 * delivery
                            + 0.13 * language
                            + 0.10 * clarity
                        )
                        score_components = {
                            "relevance": semantic,
                            "conceptCoverage": concept_coverage,
                            "responseCompleteness": response_completeness,
                            "delivery": delivery,
                            "languageQuality": language,
                            "clarity": clarity,
                        }
                    else:
                        combined = (
                            0.25 * semantic
                            + 0.25 * task_completeness
                            + 0.15 * direct
                            + 0.14 * delivery
                            + 0.11 * language
                            + 0.10 * response_completeness
                        )
                        score_components = {
                            "relevance": semantic,
                            "taskCompleteness": task_completeness,
                            "directAnswer": direct,
                            "delivery": delivery,
                            "languageQuality": language,
                            "responseCompleteness": response_completeness,
                        }
                    confidence = 0.61 if self.bge.ready else 0.50
                else:
                    combined = 0.48 * semantic + 0.30 * response_completeness + 0.22 * delivery
                    score_components = {
                        "relevance": semantic,
                        "responseCompleteness": response_completeness,
                        "delivery": delivery,
                    }
                    confidence = 0.45 if self.bge.ready else 0.27

                score = bucket(combined, 3)

        if "koreanFeedback" not in evidence:
            generated = self.qwen.korean_feedback(
                question.task_type,
                question.prompt,
                transcript,
                {
                    "score": score,
                    "maxScore": max_score,
                    "features": features,
                    "evidence": evidence,
                },
            )
            if generated:
                evidence["koreanFeedback"] = generated

        evidence["scoreComponents"] = score_components
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
                "languageAnalysis": self.qwen.version if self.qwen.ready else "disabled",
                "feedback": self.qwen.version if self.qwen.ready else "disabled",
                "pronunciation": self.pronunciation.version if self.pronunciation.ready else "disabled",
                "calibrator": "rule-buckets-unvalidated-v0.3",
            },
        }
