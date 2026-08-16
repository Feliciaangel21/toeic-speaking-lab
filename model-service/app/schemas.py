from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict

TaskType = Literal["read_aloud", "describe_picture", "respond_questions", "info_response", "opinion"]


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


class ProviderState(BaseModel):
    name: str
    version: str
    ready: bool
    detail: str | None = None
