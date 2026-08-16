import type { Question } from "./types";
import type { EvaluationProviders } from "@/evaluation/providers";
import { evaluateAttempt } from "@/evaluation/evaluator";
import type { ItemEvaluation } from "@/evaluation/contracts";

// Stable boundary used by the website. Model-specific code belongs in src/evaluation/providers/*
// or in a separate local scorer service, never inside the exam runner.
export type ScoringInput = {
  question: Question;
  audioBlob: Blob;
  durationMs?: number;
};

export type ScoringResult = ItemEvaluation;

let configuredProviders: EvaluationProviders | null = null;

export function configureScoringProviders(providers: EvaluationProviders) {
  configuredProviders = providers;
}

export async function scoreResponse(input: ScoringInput): Promise<ScoringResult | null> {
  if (!configuredProviders) return null;
  return evaluateAttempt(
    {
      question: input.question,
      audioBlob: input.audioBlob,
      durationMs: input.durationMs ?? input.question.responseSeconds * 1000,
    },
    configuredProviders,
  );
}
