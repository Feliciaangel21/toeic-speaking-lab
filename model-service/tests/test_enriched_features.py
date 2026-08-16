from app.providers.qwen import QwenProvider
from app.text_features import basic_features


def test_basic_features_include_lexical_diagnostics():
    result = basic_features(
        "I usually meet my friends and we usually grab coffee together.",
        speech_ms=6000,
    )
    assert result["wordCount"] > 0
    assert result["uniqueWordCount"] > 0
    assert 0.0 <= result["lexicalDiversity"] <= 1.0
    assert 0.0 <= result["rootTtr"] <= 1.0
    assert 0.0 <= result["contentWordRatio"] <= 1.0
    assert 0.0 <= result["contentLexicalDiversity"] <= 1.0


def test_qwen_json_extraction_accepts_fenced_json():
    payload = QwenProvider._extract_json('before```json\n{"confidence": 0.8}\n```after')
    assert payload["confidence"] == 0.8


def test_qwen_string_lists_are_bounded_and_deduplicated():
    values = ["one", "one", "two", "three", "four", "five", "six", "seven"]
    result = QwenProvider._short_strings(values, limit=4)
    assert result == ["one", "two", "three", "four"]
