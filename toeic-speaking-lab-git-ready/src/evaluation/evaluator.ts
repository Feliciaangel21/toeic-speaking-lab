import type { EvaluationProviders } from "./providers";
import type { EvaluationRequest, ItemEvaluation } from "./contracts";
import { TASK_PROFILE } from "./task-profile";
import { basicTextFeatures } from "./text-features";
import { prototypeCalibrate } from "./prototype-calibrator";

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function evaluateAttempt(
  request: EvaluationRequest,
  providers: EvaluationProviders,
): Promise<ItemEvaluation> {
  const { question, audioBlob, durationMs } = request;
  const profile = TASK_PROFILE[question.taskType];

  const [asr, vad] = await Promise.all([
    providers.asr.transcribe(audioBlob),
    providers.vad?.analyze(audioBlob),
  ]);

  const speakingMs = vad?.speechMs ?? durationMs;
  const text = basicTextFeatures(asr.transcript, speakingMs);

  const pronunciation = profile.needsPronunciation && providers.pronunciation
    ? await providers.pronunciation.assess({
        audio: audioBlob,
        referenceText: typeof question.metadata.referenceText === "string" ? question.metadata.referenceText : question.passage,
      })
    : undefined;

  const semantic = profile.needsSemantic && providers.semantic
    ? await providers.semantic.assess({ question, transcript: asr.transcript })
    : undefined;

  const language = question.taskType !== "read_aloud" && providers.language
    ? await providers.language.assess(asr.transcript)
    : undefined;

  const argument = profile.needsArgument && providers.argument
    ? await providers.argument.assess(asr.transcript)
    : undefined;

  const expectedFacts = strings(question.metadata.expectedFacts);
  const facts = profile.needsFacts && providers.facts
    ? await providers.facts.assess({ transcript: asr.transcript, expectedFacts })
    : undefined;

  const features = {
    durationMs,
    wordCount: text.wordCount,
    wpm: text.wpm,
    pauseRatio: vad?.pauseRatio,
    pauseCount: vad?.pauseCount,
    longPauseCount: vad?.longPauseCount,
    fillerRatio: text.fillerRatio,
    repetitionRatio: text.repetitionRatio,
    pronunciation: pronunciation?.accuracy,
    fluency: pronunciation?.fluency,
    prosody: pronunciation?.prosody,
    completeness: pronunciation?.completeness,
    grammarControl: language?.grammarControl,
    vocabulary: language?.vocabulary,
    cohesion: language?.cohesion,
    relevance: semantic?.relevance,
    conceptCoverage: semantic?.conceptCoverage,
    slotCompletion: semantic?.slotCompletion,
    factAccuracy: facts?.accuracy,
    positionPresent: argument?.positionPresent,
    reasonCount: argument?.reasonCount,
    exampleCount: argument?.exampleCount,
    development: argument?.development,
  };

  const numericForCalibrator: Record<string, number | boolean | undefined> = {
    pronunciation: features.pronunciation,
    fluency: features.fluency,
    prosody: features.prosody,
    completeness: features.completeness,
    grammarControl: features.grammarControl,
    vocabulary: features.vocabulary,
    cohesion: features.cohesion,
    relevance: features.relevance,
    conceptCoverage: features.conceptCoverage,
    slotCompletion: features.slotCompletion,
    factAccuracy: features.factAccuracy,
    positionPresent: features.positionPresent,
    development: features.development,
  };

  const prediction = providers.calibrator
    ? await providers.calibrator.predict({ question, features: numericForCalibrator })
    : prototypeCalibrate(question, numericForCalibrator);

  return {
    status: providers.calibrator ? "calibrated" : "experimental",
    taskType: question.taskType,
    rawItemScore: prediction.score,
    maxItemScore: profile.maxScore,
    confidence: prediction.confidence ?? null,
    transcript: asr.transcript,
    features,
    evidence: {
      matchedFacts: facts?.matched,
      missingFacts: facts?.missing,
      strengths: [],
      improvements: [],
    },
    modelVersions: {
      pipeline: "toeic-eval-contract-v0.1",
      asr: providers.asr.version,
      vad: providers.vad?.version,
      pronunciation: providers.pronunciation?.version,
      semantic: providers.semantic?.version,
      grammar: providers.language?.version,
      calibrator: providers.calibrator?.version ?? "prototype-unvalidated-v0",
    },
  };
}
