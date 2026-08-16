from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    service_token: str = os.getenv("MODEL_SERVICE_TOKEN", "")
    whisper_bin: str = os.getenv("WHISPER_CPP_BIN", "/opt/whisper.cpp/build/bin/whisper-cli")
    whisper_model: str = os.getenv("WHISPER_CPP_MODEL", "/models/ggml-base.en.bin")
    whisper_threads: int = int(os.getenv("WHISPER_CPP_THREADS", "4"))
    bge_model: str = os.getenv("BGE_MODEL", "BAAI/bge-small-en-v1.5")
    qwen_model: str = os.getenv("QWEN_MODEL", "Qwen/Qwen3-0.6B")
    enable_silero: bool = env_flag("ENABLE_SILERO", True)
    enable_bge: bool = env_flag("ENABLE_BGE", False)
    enable_qwen: bool = env_flag("ENABLE_QWEN", False)
    enable_feedback: bool = env_flag("ENABLE_QWEN_FEEDBACK", False)
    enable_language_analysis: bool = env_flag("ENABLE_QWEN_LANGUAGE_ANALYSIS", True)
    model_cache: str = os.getenv("HF_HOME", "/models/huggingface")

    # Optional pronunciation adapter. This intentionally does not pretend that
    # Whisper/VAD can score pronunciation. The command receives JSON on stdin
    # and must return a PronunciationAssessment-shaped JSON object on stdout.
    enable_pronunciation: bool = env_flag("ENABLE_PRONUNCIATION", False)
    pronunciation_command: str = os.getenv("PRONUNCIATION_COMMAND", "")
    pronunciation_timeout_sec: int = int(os.getenv("PRONUNCIATION_TIMEOUT_SEC", "180"))

    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_server_key: str = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_storage_bucket: str = os.getenv("SUPABASE_STORAGE_BUCKET", "speaking-recordings")
    enable_local_runner: bool = env_flag("ENABLE_LOCAL_RUNNER", True)

    @property
    def whisper_ready(self) -> bool:
        return Path(self.whisper_bin).exists() and Path(self.whisper_model).exists()


settings = Settings()
