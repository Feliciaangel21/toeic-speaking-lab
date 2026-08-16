from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

NUMBER_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5",
    "six": "6", "seven": "7", "eight": "8", "nine": "9", "ten": "10", "eleven": "11",
    "twelve": "12", "thirteen": "13", "fourteen": "14", "fifteen": "15", "sixteen": "16",
    "seventeen": "17", "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30",
    "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70", "eighty": "80", "ninety": "90",
}


def normalize(text: str) -> str:
    value = text.lower().replace("a.m.", "am").replace("p.m.", "pm")
    for word, number in NUMBER_WORDS.items():
        value = re.sub(rf"\b{word}\b", number, value)
    value = value.replace("o'clock", "00")
    value = re.sub(r"[^a-z0-9$:%]+", " ", value)
    return " ".join(value.split())


def fact_match(expected: str, transcript: str) -> tuple[bool, float]:
    fact = normalize(expected)
    answer = normalize(transcript)
    if not fact:
        return False, 0.0
    if fact in answer:
        return True, 1.0

    fact_tokens = set(fact.split())
    answer_tokens = set(answer.split())
    token_coverage = len(fact_tokens & answer_tokens) / max(len(fact_tokens), 1)
    sequence = SequenceMatcher(None, fact, answer).ratio()

    # High precision: do not call a partial phrase a match unless most expected tokens are present.
    confidence = max(token_coverage, sequence)
    return token_coverage >= 0.8, confidence


def match_expected_facts(expected_facts: list[str], transcript: str) -> dict[str, Any]:
    matched: list[str] = []
    missing: list[str] = []
    details: list[dict[str, Any]] = []
    for fact in expected_facts:
        is_match, confidence = fact_match(fact, transcript)
        (matched if is_match else missing).append(fact)
        details.append({"fact": fact, "matched": is_match, "confidence": round(confidence, 3)})
    accuracy = len(matched) / max(len(expected_facts), 1)
    return {"accuracy": accuracy, "matched": matched, "missing": missing, "details": details}
