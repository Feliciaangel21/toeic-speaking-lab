import type { Question } from "../lib/types";
import { TASK_PROFILE } from "./task-profile";

// Deliberately conservative placeholder. These are NOT ETS weights.
// Replace with a human-rated ordinal calibrator before displaying a TOEIC-like score.
export function prototypeCalibrate(question: Question, features: Record<string, number | boolean | undefined>) {
  const max = TASK_PROFILE[question.taskType].maxScore;
  const values = Object.values(features)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(1, value)));

  if (!values.length) return { score: 0, confidence: 0.1 };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const score = Math.max(0, Math.min(max, Math.round(mean * max)));
  return { score, confidence: 0.25 };
}
