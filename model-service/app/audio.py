from __future__ import annotations

import subprocess
from pathlib import Path


def convert_to_wav(input_path: Path, output_path: Path) -> None:
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(input_path), "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(output_path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {completed.stderr.strip()[:800]}")
