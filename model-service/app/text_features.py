from __future__ import annotations

import re
from collections import Counter

FILLERS = {"um", "uh", "erm", "hmm", "like", "you know"}


def tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9']+", text.lower())


def safe_ratio(num: float, den: float) -> float:
    return 0.0 if den <= 0 else num / den


def basic_features(transcript: str, speech_ms: int) -> dict[str, float | int]:
    ts = tokens(transcript)
    word_count = len(ts)
    minutes = max(speech_ms, 1) / 60000
    filler_count = sum(1 for token in ts if token in FILLERS)
    adjacent_repeats = sum(1 for i in range(1, len(ts)) if ts[i] == ts[i - 1])
    return {
        "wordCount": word_count,
        "wpm": round(word_count / minutes, 2),
        "fillerRatio": safe_ratio(filler_count, word_count),
        "repetitionRatio": safe_ratio(adjacent_repeats, word_count),
    }


def lexical_recall(reference: str, transcript: str) -> float:
    ref = Counter(tokens(reference))
    hyp = Counter(tokens(transcript))
    if not ref:
        return 0.0
    overlap = sum(min(count, hyp[word]) for word, count in ref.items())
    return overlap / sum(ref.values())


def argument_features(transcript: str) -> dict[str, int | bool | float]:
    lower = transcript.lower()
    reasons = len(re.findall(r"\b(?:because|since|one reason|another reason|first(?:ly)?|second(?:ly)?)\b", lower))
    examples = len(re.findall(r"\b(?:for example|for instance|such as|in my experience)\b", lower))
    position = bool(re.search(r"\b(?:i think|i believe|in my opinion|i prefer|i agree|i disagree|the best|more important)\b", lower))
    wc = len(tokens(transcript))
    development = min(1.0, (0.25 if position else 0.0) + min(reasons, 2) * 0.22 + min(examples, 2) * 0.18 + min(wc / 120, 1) * 0.17)
    return {"positionPresent": position, "reasonCount": reasons, "exampleCount": examples, "development": development}
