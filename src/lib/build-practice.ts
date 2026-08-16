import practiceBank from "../data/practice-question-bank.json";
import type { Question } from "./types";

export const PRACTICE_SETS = Array.from({ length: 15 }, (_, i) => ({
  id: `practice-${String(i + 1).padStart(2, "0")}`,
  number: i + 1,
  readAloud: [practiceBank.readAloud[i * 2]?.id, practiceBank.readAloud[i * 2 + 1]?.id],
  pictures: [practiceBank.pictures[(i * 2 + 14) % 30]?.id, practiceBank.pictures[(i * 2 + 15) % 30]?.id],
  interviewGroup: practiceBank.interviewGroups[i]?.id,
  infoGroup: practiceBank.infoGroups[i]?.id,
  opinion: practiceBank.opinions[i]?.id,
}));

function findById<T extends { id: string }>(items: readonly T[], id: string | undefined) {
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`Practice-bank item not found: ${id}`);
  return found;
}

export function buildPracticeTest(setNumber = 1): Question[] {
  const idx = Math.max(1, Math.min(15, setNumber)) - 1;
  const set = PRACTICE_SETS[idx];
  const q: Question[] = [];

  set.readAloud.forEach((id) => {
    const item = findById(practiceBank.readAloud, id);
    q.push({
      id: item.id,
      taskType: "read_aloud",
      prompt: "Read the text aloud.",
      passage: item.text,
      prepSeconds: 45,
      responseSeconds: 45,
      metadata: {
        referenceText: item.text,
        rubric: ["pronunciation", "intonation_stress"],
        practiceSet: set.id,
        contentBank: "practice",
      },
    });
  });

  set.pictures.forEach((id) => {
    const item = findById(practiceBank.pictures, id);
    q.push({
      id: item.id,
      taskType: "describe_picture",
      prompt: "Describe the picture in as much detail as you can.",
      imageUrl: item.imageUrl,
      imageAlt: item.alt,
      prepSeconds: 45,
      responseSeconds: 30,
      metadata: {
        scene: item.scene,
        concepts: item.concepts,
        sampleAnswer: item.sampleAnswer,
        rubric: ["pronunciation", "intonation_stress", "grammar", "vocabulary", "cohesion"],
        practiceSet: set.id,
        contentBank: "practice",
      },
    });
  });

  const interview = findById(practiceBank.interviewGroups, set.interviewGroup);
  interview.questions.forEach((item) => q.push({
    id: item.id,
    taskType: "respond_questions",
    prompt: item.prompt,
    context: interview.intro,
    prepSeconds: 3,
    responseSeconds: item.responseSeconds,
    groupId: interview.id,
    metadata: {
      slots: item.slots,
      topic: interview.topic,
      sampleAnswer: item.sampleAnswer,
      rubric: ["delivery", "language_use", "relevance", "completeness"],
      practiceSet: set.id,
      contentBank: "practice",
    },
  }));

  const info = findById(practiceBank.infoGroups, set.infoGroup);
  info.questions.forEach((item, itemIdx) => q.push({
    id: item.id,
    taskType: "info_response",
    prompt: item.prompt,
    context: info.intro,
    information: info.information,
    prepSeconds: 3,
    responseSeconds: item.responseSeconds,
    studySeconds: itemIdx === 0 ? 45 : 0,
    repeatPrompt: itemIdx === 2 ? 2 : 1,
    groupId: info.id,
    metadata: {
      expectedFacts: item.expectedFacts,
      sampleAnswer: item.sampleAnswer,
      rubric: ["delivery", "language_use", "relevance", "completeness"],
      practiceSet: set.id,
      contentBank: "practice",
    },
  }));

  const opinion = findById(practiceBank.opinions, set.opinion);
  q.push({
    id: opinion.id,
    taskType: "opinion",
    prompt: opinion.prompt,
    prepSeconds: 45,
    responseSeconds: 60,
    metadata: {
      sampleAnswer: opinion.sampleAnswer,
      rubric: ["opinion", "support", "coherence", "delivery", "grammar", "vocabulary"],
      practiceSet: set.id,
      contentBank: "practice",
    },
  });

  return q.map((item, index) => ({ ...item, number: index + 1 }));
}

export function findPracticeQuestionById(questionId: string): Question | null {
  for (let setNumber = 1; setNumber <= 15; setNumber += 1) {
    const found = buildPracticeTest(setNumber).find((question) => question.id === questionId);
    if (found) return found;
  }
  return null;
}
