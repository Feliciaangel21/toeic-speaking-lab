from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TaskType = Literal[
    "read_aloud",
    "describe_picture",
    "respond_questions",
    "info_response",
    "opinion",
]


class QuestionPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    number: int | None = None
    task_type: TaskType = Field(alias="taskType")
    prompt: str
    passage: str | None = None
    image_alt: str | None = Field(default=None, alias="imageAlt")
    information: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class LlmFactVerification(BaseModel):
    supported: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    contradicted: list[str] = Field(default_factory=list)
    ambiguous: list[str] = Field(default_factory=list)
    answer_complete: bool = False
    confidence: float = 0.0
    korean_feedback: str | None = None


class LanguageCorrection(BaseModel):
    original: str
    corrected: str
    category: str = "grammar"
    explanation_ko: str | None = None


class LlmResponseAnalysis(BaseModel):
    """Structured evidence from the local LLM.

    Normalized numbers are diagnostic signals in [0, 1], not TOEIC scores.
    The LLM is intentionally not allowed to assign an official/estimated TOEIC score.
    """

    grammar_accuracy: float = 0.0
    vocabulary_quality: float = 0.0
    clarity: float = 0.0
    direct_answer: bool = False
    task_completeness: float = 0.0
    development: float = 0.0
    grammar_errors: list[LanguageCorrection] = Field(default_factory=list)
    vocabulary_issues: list[LanguageCorrection] = Field(default_factory=list)
    better_expressions: list[str] = Field(default_factory=list)
    supported_points: list[str] = Field(default_factory=list)
    missing_points: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    korean_feedback: str | None = None


class PronunciationAssessment(BaseModel):
    """Normalized pronunciation evidence from an optional local adapter."""

    accuracy: float | None = None
    completeness: float | None = None
    fluency: float | None = None
    prosody: float | None = None
    total: float | None = None
    word_scores: list[dict[str, Any]] = Field(default_factory=list)
    provider: str = "unavailable"
    experimental: bool = True


class ProviderState(BaseModel):
    name: str
    version: str
    ready: bool
    detail: str | None = None
