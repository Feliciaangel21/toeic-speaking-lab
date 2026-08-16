export type TaskType =
  | "read_aloud"
  | "describe_picture"
  | "respond_questions"
  | "info_response"
  | "opinion";

export type Question = {
  id: string;
  number?: number;
  taskType: TaskType;
  prompt: string;
  context?: string;
  passage?: string;
  imageUrl?: string;
  imageAlt?: string;
  information?: InfoSheet;
  prepSeconds: number;
  responseSeconds: number;
  studySeconds?: number;
  repeatPrompt?: number;
  groupId?: string;
  metadata: Record<string, unknown>;
};

export type InfoSheet = {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; value: string }>;
  notes?: string[];
};

export type InterviewGroup = {
  id: string;
  intro: string;
  topic: string;
  questions: Array<{
    id: string;
    prompt: string;
    responseSeconds: number;
    slots: string[];
  }>;
};

export type InfoGroup = {
  id: string;
  intro: string;
  information: InfoSheet;
  questions: Array<{
    id: string;
    prompt: string;
    responseSeconds: number;
    expectedFacts: string[];
  }>;
};

export type RecordedAttempt = {
  questionId: string;
  questionNumber: number;
  taskType: TaskType;
  durationMs: number;
  transcript?: string | null;
  featureJson?: Record<string, unknown> | null;
  scoreJson?: Record<string, unknown> | null;
  audioBlob?: Blob | null;
  audioMimeType?: string | null;
};
