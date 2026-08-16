// Architecture decisions only. Importing this file does not download or initialize any model.
export const MODEL_PLAN = {
  asr: {
    primary: "whisper.cpp-v1.9.1/base.en",
    quantizationBenchmark: ["base.en", "base.en-q5_1", "tiny.en-q5_1"],
    runtime: "separate-model-service",
  },
  vad: {
    primary: "silero-vad/onnx",
  },
  pronunciation: {
    primaryPhase2: "YuanGongND/GOPT",
    initialTasks: ["read_aloud"],
    note: "Do not block V1 deployment on GOP/Kaldi preprocessing.",
  },
  semantic: {
    primary: "BAAI/bge-small-en-v1.5",
    fallback: "sentence-transformers/all-MiniLM-L6-v2",
  },
  llm: {
    primary: "Qwen/Qwen3-0.6B",
    uses: ["q8-q10-fact-verification", "korean-feedback"],
    scoringAuthority: false,
  },
  infoResponseHybrid: {
    deterministicFactWeight: 0.7,
    llmVerifierWeight: 0.3,
    llmMayAssignScore: false,
  },
  calibrator: {
    current: "experimental-rule-buckets",
    target: "human-rated-ordinal-calibrator",
    requiresHumanRatedData: true,
  },
} as const;
