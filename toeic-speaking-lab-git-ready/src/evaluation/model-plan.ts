// Architecture decisions only. Importing this file does not download or initialize any model.
export const MODEL_PLAN = {
  asr: {
    primary: "whisper.cpp/base.en-q5_1",
    benchmarkAlternative: "whisper.cpp/tiny.en-q5_1",
    heavierAlternative: "distil-whisper/distil-small.en",
  },
  vad: {
    primary: "silero-vad/onnx-v6.x",
  },
  pronunciation: {
    primary: "YuanGongND/GOPT",
    initialTasks: ["read_aloud"],
  },
  semantic: {
    primary: "BAAI/bge-small-en-v1.5",
    fallback: "sentence-transformers/all-MiniLM-L6-v2",
  },
  feedback: {
    primaryOptional: "Qwen/Qwen3-0.6B",
    fallback: "google/gemma-3-1b-it",
    scoringAuthority: false,
  },
  calibrator: {
    primary: "ordinal-regression-or-tree-model",
    requiresHumanRatedData: true,
  },
} as const;
