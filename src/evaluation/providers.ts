import type { Question } from "../lib/types";
import type {
  ArgumentOutput,
  AsrOutput,
  FactOutput,
  LanguageOutput,
  PronunciationOutput,
  SemanticOutput,
  VadOutput,
} from "./contracts";

export interface AsrProvider {
  readonly version: string;
  transcribe(audio: Blob): Promise<AsrOutput>;
}

export interface VadProvider {
  readonly version: string;
  analyze(audio: Blob): Promise<VadOutput>;
}

export interface PronunciationProvider {
  readonly version: string;
  assess(input: { audio: Blob; referenceText?: string }): Promise<PronunciationOutput>;
}

export interface SemanticProvider {
  readonly version: string;
  assess(input: { question: Question; transcript: string }): Promise<SemanticOutput>;
}

export interface LanguageProvider {
  readonly version: string;
  assess(transcript: string): Promise<LanguageOutput>;
}

export interface ArgumentProvider {
  readonly version: string;
  assess(transcript: string): Promise<ArgumentOutput>;
}

export interface FactProvider {
  readonly version: string;
  assess(input: { transcript: string; expectedFacts: string[] }): Promise<FactOutput>;
}

export interface CalibratorProvider {
  readonly version: string;
  predict(input: { question: Question; features: Record<string, number | boolean | undefined> }): Promise<{
    score: number;
    confidence?: number;
  }>;
}

export type EvaluationProviders = {
  asr: AsrProvider;
  vad?: VadProvider;
  pronunciation?: PronunciationProvider;
  semantic?: SemanticProvider;
  language?: LanguageProvider;
  argument?: ArgumentProvider;
  facts?: FactProvider;
  calibrator?: CalibratorProvider;
};
