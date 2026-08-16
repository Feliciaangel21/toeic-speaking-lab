import type { TaskType } from "../lib/types";

export const TASK_PROFILE: Record<TaskType, {
  maxScore: 3 | 5;
  needsPronunciation: boolean;
  needsSemantic: boolean;
  needsFacts: boolean;
  needsArgument: boolean;
}> = {
  read_aloud: {
    maxScore: 3,
    needsPronunciation: true,
    needsSemantic: false,
    needsFacts: false,
    needsArgument: false,
  },
  describe_picture: {
    maxScore: 3,
    needsPronunciation: false,
    needsSemantic: true,
    needsFacts: false,
    needsArgument: false,
  },
  respond_questions: {
    maxScore: 3,
    needsPronunciation: false,
    needsSemantic: true,
    needsFacts: false,
    needsArgument: false,
  },
  info_response: {
    maxScore: 3,
    needsPronunciation: false,
    needsSemantic: false,
    needsFacts: true,
    needsArgument: false,
  },
  opinion: {
    maxScore: 5,
    needsPronunciation: false,
    needsSemantic: true,
    needsFacts: false,
    needsArgument: true,
  },
};
