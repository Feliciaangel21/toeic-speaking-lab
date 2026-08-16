from __future__ import annotations

import json
import re
from typing import Any

from app.config import settings
from app.schemas import LlmFactVerification


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
            self._tokenizer = AutoTokenizer.from_pretrained(settings.qwen_model, cache_dir=settings.model_cache)
            self._model = AutoModelForCausalLM.from_pretrained(
                settings.qwen_model,
                torch_dtype="auto",
                cache_dir=settings.model_cache,
            ).to(self._device)
            self._model.eval()
        return self._tokenizer, self._model, self._device

    def _generate(self, system: str, user: str, max_new_tokens: int = 320) -> str:
        if not self.ready:
            raise RuntimeError("Qwen provider is disabled or dependencies are missing")
        tokenizer, model, device = self._load()
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
        try:
            rendered = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)
        except TypeError:
            rendered = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(rendered, return_tensors="pt").to(device)
        outputs = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
        generated = outputs[0][inputs["input_ids"].shape[-1]:]
        return tokenizer.decode(generated, skip_special_tokens=True).strip()

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any]:
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S)
        candidate = fenced.group(1) if fenced else None
        if candidate is None:
            start = text.find("{")
            end = text.rfind("}")
            if start >= 0 and end > start:
                candidate = text[start:end + 1]
        if candidate is None:
            raise ValueError("Qwen did not return a JSON object")
        return json.loads(candidate)

    def verify_facts(self, question: str, expected_facts: list[str], transcript: str) -> LlmFactVerification | None:
        if not self.ready:
            return None
        system = (
            "You are a strict evidence verifier for an English speaking test. "
            "Do not assign a test score. Check only whether each reference fact is supported by the student's transcript. "
            "Accept clear paraphrases. Never invent facts. Return JSON only."
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
  "korean_feedback": "1-2 short Korean sentences explaining only the important missing or incorrect information"
}}
""".strip()
        try:
            payload = self._extract_json(self._generate(system, user))
            allowed = set(expected_facts)
            for key in ("supported", "missing", "contradicted", "ambiguous"):
                values = payload.get(key, [])
                payload[key] = [str(value) for value in values if str(value) in allowed]
            payload["confidence"] = max(0.0, min(1.0, float(payload.get("confidence", 0.0))))
            return LlmFactVerification.model_validate(payload)
        except Exception:
            return None

    def korean_feedback(self, task_type: str, question: str, transcript: str, evidence: dict[str, Any]) -> str | None:
        if not self.ready or not settings.enable_feedback:
            return None
        system = (
            "You are a Korean speaking-practice coach. Explain evidence that was already computed by another scorer. "
            "Never claim an official TOEIC score and never change the numeric result. Be concise and specific."
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
