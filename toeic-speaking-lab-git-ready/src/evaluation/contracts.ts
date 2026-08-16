import type { Question, TaskType } from "../lib/types";

export type NormalizedScore = number; // 0..1

export type ModelVersions = {
  pipeline: string;
  asr?: string;
  vad?: string;
  pronunciation?: string;
  semantic?: string;
  grammar?: string;
  calibrator?: string;
  feedback?: string;
};

export type TranscriptWord = {
  text: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
};

export type AsrOutput = {
  transcript: string;
  words?: TranscriptWord[];
  language?: string;
  confidence?: number;
};

export type VadOutput = {
  speechMs: number;
  silenceMs: number;
  pauseCount: number;
  longPauseCount: number;
  pauseRatio: number;
};

export type PronunciationOutput = {
  accuracy?: NormalizedScore;
  fluency?: NormalizedScore;
  prosody?: NormalizedScore;
  completeness?: NormalizedScore;
  wordScores?: Array<{ word: string; score: NormalizedScore }>;
};

export type SemanticOutput = {
  relevance?: NormalizedScore;
  conceptCoverage?: NormalizedScore;
  slotCompletion?: NormalizedScore;
};

export type LanguageOutput = {
  grammarControl?: NormalizedScore;
  vocabulary?: NormalizedScore;
  cohesion?: NormalizedScore;
  grammarErrorRate?: number;
};

export type ArgumentOutput = {
  positionPresent?: boolean;
  reasonCount?: number;
  exampleCount?: number;
  development?: NormalizedScore;
};

export type FactOutput = {
  accuracy?: NormalizedScore;
  matched: string[];
  missing: string[];
};

export type EvaluationFeatureVector = {
  durationMs: number;
  wordCount?: number;
  wpm?: number;
  pauseRatio?: number;
  pauseCount?: number;
  longPauseCount?: number;
  fillerRatio?: number;
  repetitionRatio?: number;
  pronunciation?: NormalizedScore;
  fluency?: NormalizedScore;
  prosody?: NormalizedScore;
  completeness?: NormalizedScore;
  grammarControl?: NormalizedScore;
  vocabulary?: NormalizedScore;
  cohesion?: NormalizedScore;
  relevance?: NormalizedScore;
  conceptCoverage?: NormalizedScore;
  slotCompletion?: NormalizedScore;
  factAccuracy?: NormalizedScore;
  positionPresent?: boolean;
  reasonCount?: number;
  exampleCount?: number;
  development?: NormalizedScore;
};

export type ItemEvaluation = {
  status: "experimental" | "calibrated";
  taskType: TaskType;
  rawItemScore: number | null;
  maxItemScore: 3 | 5;
  confidence: number | null;
  transcript: string;
  features: EvaluationFeatureVector;
  evidence: {
    matchedFacts?: string[];
    missingFacts?: string[];
    strengths: string[];
    improvements: string[];
  };
  modelVersions: ModelVersions;
};

export type EvaluationRequest = {
  question: Question;
  audioBlob: Blob;
  durationMs: number;
};
