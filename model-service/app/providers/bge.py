from __future__ import annotations

from typing import Iterable
from app.config import settings


class BgeProvider:
    version = "BAAI/bge-small-en-v1.5"

    def __init__(self) -> None:
        self._model = None

    @property
    def ready(self) -> bool:
        if not settings.enable_bge:
            return False
        try:
            import sentence_transformers  # noqa: F401
            return True
        except Exception:
            return False

    def _load(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(settings.bge_model, cache_folder=settings.model_cache)
        return self._model

    def similarity(self, transcript: str, references: Iterable[str]) -> float | None:
        refs = [ref.strip() for ref in references if isinstance(ref, str) and ref.strip()]
        if not transcript.strip() or not refs or not self.ready:
            return None
        model = self._load()
        vectors = model.encode([transcript, *refs], normalize_embeddings=True)
        query = vectors[0]
        scores = [float(query @ candidate) for candidate in vectors[1:]]
        # BGE cosine may be negative for unrelated text. Normalize to 0..1 conservatively.
        best = max(scores)
        return max(0.0, min(1.0, (best + 1.0) / 2.0))
