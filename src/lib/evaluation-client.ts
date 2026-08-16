import type { RecordedAttempt } from "./types";
import type { ItemEvaluation } from "@/evaluation/contracts";

export async function requestAttemptEvaluation(attempt: RecordedAttempt): Promise<ItemEvaluation | null> {
  if (!attempt.audioBlob || attempt.audioBlob.size === 0) return null;

  const body = new FormData();
  body.set("questionId", attempt.questionId);
  body.set("durationMs", String(attempt.durationMs));
  body.set("audio", attempt.audioBlob, `q${String(attempt.questionNumber).padStart(2, "0")}.webm`);

  const response = await fetch("/api/evaluate", { method: "POST", body });
  if (!response.ok) return null;
  return response.json() as Promise<ItemEvaluation>;
}
