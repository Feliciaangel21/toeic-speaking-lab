from __future__ import annotations

import json
import re
from typing import Any

from app.config import settings
from app.schemas import LlmFactVerification, LlmResponseAnalysis


class QwenProvider:
    version = "Qwen/Qwen3-0.6B"

    def __init__(self) -> None:
        self._tokenizer = None
        self._model = None
        self._device = None

    @property
    def ready(self) -> bool:
        if not settings.enable_qwen:
            return False
        try:
            import torch  # noqa: F401
            import transformers  # noqa: F401
            return True
        except Exception:
            return False

    def _load(self):
        if self._model is None:
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            self._tokenizer = AutoTokenizer.from_pretrained(
                settings.qwen_model,
                cache_dir=settings.model_cache,
            )
            self._model = AutoModelForCausalLM.from_pretrained(
                settings.qwen_model,
                torch_dtype="auto",
                cache_dir=settings.model_cache,
            ).to(self._device)
            self._model.eval()
        return self._tokenizer, self._model, self._device

    def _generate(self, system: str, user: str, max_new_tokens: int = 420) -> str:
        if not self.ready:
            raise RuntimeError("Qwen provider is disabled or dependencies are missing")
        tokenizer, model, device = self._load()
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        try:
            rendered = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
                enable_thinking=False,
            )
        except TypeError:
            rendered = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        inputs = tokenizer(rendered, return_tensors="pt").to(device)
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
        )
        generated = outputs[0][inputs["input_ids"].shape[-1] :]
        return tokenizer.decode(generated, skip_special_tokens=True).strip()

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any]:
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
        candidate = fenced.group(1) if fenced else None
        if candidate is None:
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                candidate = text[start : end + 1]
        if candidate is None:
            raise ValueError("Qwen did not return a JSON object")
        payload = json.loads(candidate)
        if not isinstance(payload, dict):
            raise ValueError("Qwen JSON root was not an object")
        return payload

    @staticmethod
    def _clamp01(value: Any) -> float:
        try:
            return max(0.0, min(1.0, float(value)))
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _short_strings(values: Any, *, limit: int = 6, max_chars: int = 220) -> list[str]:
        if not isinstance(values, list):
            return []
        result: list[str] = []
        for value in values:
            text = str(value).strip()
            if text and text not in result:
                result.append(text[:max_chars])
            if len(result) >= limit:
                break
        return result

    def verify_facts(
        self,
        question: str,
        expected_facts: list[str],
        transcript: str,
    ) -> LlmFactVerification | None:
        if not self.ready:
            return None
        system = (
            "You are a strict evidence verifier for an English speaking test. "
            "Do not assign a TOEIC or test score. Check only whether each reference fact "
            "is supported by the student's transcript. Accept clear paraphrases. "
            "Never invent facts. Return JSON only."
        )
        user = f"""
Question: {question}
Reference facts: {json.dumps(expected_facts, ensure_ascii=False)}
Student transcript: {transcript}

Return exactly this JSON shape:
{{
  "supported": ["reference fact strings that are clearly supported"],
  "missing": ["reference fact strings not stated"],
  "contradicted": ["reference fact strings contradicted by the answer"],
  "ambiguous": ["reference fact strings that might be implied but are not clear"],
  "answer_complete": true,
  "confidence": 0.0,
  "korean_feedback": "1-2 short Korean sentences explaining only important missing or incorrect information"
}}
""".strip()
        try:
            payload = self._extract_json(self._generate(system, user))
            allowed = set(expected_facts)
            for key in ("supported", "missing", "contradicted", "ambiguous"):
                values = payload.get(key, [])
                payload[key] = [str(value) for value in values if str(value) in allowed]
            payload["confidence"] = self._clamp01(payload.get("confidence"))
            return LlmFactVerification.model_validate(payload)
        except Exception:
            return None

    def analyze_response(
        self,
        *,
        task_type: str,
        question: str,
        transcript: str,
        reference_points: list[str] | None = None,
        computed_features: dict[str, Any] | None = None,
    ) -> LlmResponseAnalysis | None:
        """Produce structured language/task evidence in one local generation.

        This replaces the old pattern where the LLM only wrote a prose coach line.
        It still cannot choose the item score or an estimated TOEIC score.
        """

        if not self.ready or not settings.enable_language_analysis:
            return None

        refs = [str(item) for item in (reference_points or []) if str(item).strip()]
        system = (
            "You analyze an ESL learner's TOEIC-style speaking response. "
            "You are an evidence extractor, not the final scorer. Never assign a TOEIC score, "
            "level, band, or 0-3/0-5 item score. Return JSON only. "
            "Judge only what is present in the transcript and prompt. "
            "For grammar errors, quote the smallest exact problematic span from the transcript. "
            "Do not mark natural spoken fragments as errors unless they materially hurt correctness. "
            "The normalized fields are diagnostic evidence from 0.0 to 1.0, not official scores."
        )
        task_guidance = {
            "describe_picture": (
                "Check whether the response accurately describes visible reference concepts, "
                "uses specific details, and avoids invented details."
            ),
            "respond_questions": (
                "Check whether the speaker directly answers the question and supplies the requested "
                "information. Short responses are acceptable when the task only asks for a short answer."
            ),
            "info_response": (
                "Focus language analysis on clarity/grammar/vocabulary. The separate fact verifier is "
                "authoritative for schedule/information correctness."
            ),
            "opinion": (
                "Check for a clear position, relevant reasons, support/examples, and logical development."
            ),
        }.get(task_type, "Check directness, clarity, relevance, and completeness.")

        user = f"""
Task type: {task_type}
Question/prompt: {question}
Reference points (may be empty): {json.dumps(refs, ensure_ascii=False)}
Student transcript: {transcript}
Precomputed non-LLM features: {json.dumps(computed_features or {}, ensure_ascii=False)}
Task guidance: {task_guidance}

Return exactly one JSON object with this shape:
{{
  "grammar_accuracy": 0.0,
  "vocabulary_quality": 0.0,
  "clarity": 0.0,
  "direct_answer": true,
  "task_completeness": 0.0,
  "development": 0.0,
  "grammar_errors": [
    {{"original": "exact span", "corrected": "correction", "category": "subject_verb_agreement", "explanation_ko": "short Korean explanation"}}
  ],
  "vocabulary_issues": [
    {{"original": "exact span", "corrected": "better wording", "category": "word_choice", "explanation_ko": "short Korean explanation"}}
  ],
  "better_expressions": ["one natural reusable expression"],
  "supported_points": ["specific content successfully covered"],
  "missing_points": ["important requested content that is missing"],
  "strengths": ["specific strength grounded in the answer"],
  "improvements": ["specific high-impact improvement"],
  "confidence": 0.0,
  "korean_feedback": "2-4 concise Korean sentences: one strength, one main fix, one concrete suggestion"
}}

Rules:
- Keep each list short (0-5 items).
- Do not invent an error if the sentence is acceptable spoken English.
- Do not penalize accent in text analysis.
- If reference points are supplied, supported_points and missing_points MUST copy the exact reference strings verbatim; do not paraphrase those list items.
- If the transcript is empty, use zeros/false and say that no answer was captured.
""".strip()

        try:
            payload = self._extract_json(self._generate(system, user, max_new_tokens=520))
            for key in (
                "grammar_accuracy",
                "vocabulary_quality",
                "clarity",
                "task_completeness",
                "development",
                "confidence",
            ):
                payload[key] = self._clamp01(payload.get(key))
            payload["direct_answer"] = bool(payload.get("direct_answer", False))
            for key in (
                "better_expressions",
                "supported_points",
                "missing_points",
                "strengths",
                "improvements",
            ):
                payload[key] = self._short_strings(payload.get(key))

            # Bound correction payload size and drop hallucinated originals that
            # do not appear in the transcript (case-insensitive).
            transcript_lower = transcript.lower()
            for key in ("grammar_errors", "vocabulary_issues"):
                cleaned: list[dict[str, str]] = []
                values = payload.get(key, [])
                if not isinstance(values, list):
                    values = []
                for value in values[:6]:
                    if not isinstance(value, dict):
                        continue
                    original = str(value.get("original", "")).strip()
                    corrected = str(value.get("corrected", "")).strip()
                    if not original or not corrected or original.lower() not in transcript_lower:
                        continue
                    cleaned.append(
                        {
                            "original": original[:180],
                            "corrected": corrected[:180],
                            "category": str(value.get("category", key[:-1]))[:80],
                            "explanation_ko": str(value.get("explanation_ko", "")).strip()[:240] or None,
                        }
                    )
                payload[key] = cleaned

            # If reference points exist, do not allow the model to silently add
            # invented reference labels to the coverage lists.
            if refs:
                allowed = set(refs)
                for key in ("supported_points", "missing_points"):
                    payload[key] = [item for item in payload[key] if item in allowed]

            if not settings.enable_feedback:
                payload["korean_feedback"] = None
            return LlmResponseAnalysis.model_validate(payload)
        except Exception:
            return None

    def korean_feedback(
        self,
        task_type: str,
        question: str,
        transcript: str,
        evidence: dict[str, Any],
    ) -> str | None:
        if not self.ready or not settings.enable_feedback:
            return None
        system = (
            "You are a Korean speaking-practice coach. Explain evidence that was already computed by "
            "another scorer. Never claim an official TOEIC score and never change the numeric result. "
            "Be concise and specific."
        )
        user = f"""
Task type: {task_type}
Question: {question}
Student transcript: {transcript}
Computed evidence: {json.dumps(evidence, ensure_ascii=False)}

Write 2-4 natural Korean sentences: one strength, the highest-impact improvement, and one concrete speaking suggestion.
""".strip()
        try:
            return self._generate(system, user, max_new_tokens=180)
        except Exception:
            return None
