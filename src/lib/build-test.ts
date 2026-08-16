import { infoPool, interviewPool, opinionPool, picturePool, readAloudPool } from "@/data/question-bank";
import type { Question } from "./types";

export const MOCK_SETS = Array.from({ length: 15 }, (_, i) => ({
  id: `mock-${String(i + 1).padStart(2, "0")}`,
  number: i + 1,
  readAloud: [readAloudPool[i * 2]?.id, readAloudPool[i * 2 + 1]?.id],
  pictures: [picturePool[i * 2]?.id, picturePool[i * 2 + 1]?.id],
  interviewGroup: interviewPool[i]?.id,
  infoGroup: infoPool[i]?.id,
  opinion: opinionPool[i]?.id,
}));

function findById<T extends { id: string }>(items: readonly T[], id: string | undefined) {
  const found = items.find((x) => x.id === id);
  if (!found) throw new Error(`Question-bank item not found: ${id}`);
  return found;
}

export function buildMockTest(setNumber = 1): Question[] {
  const idx = Math.max(1, Math.min(15, setNumber)) - 1;
  const set = MOCK_SETS[idx];
  const q: Question[] = [];

  set.readAloud.forEach((id) => {
    const item = findById(readAloudPool, id);
    q.push({ id: item.id, taskType: "read_aloud", prompt: "Read the text aloud.", passage: item.text, prepSeconds: 45, responseSeconds: 45, metadata: { referenceText: item.text, rubric: ["pronunciation", "intonation_stress"], mockSet: set.id } });
  });

  set.pictures.forEach((id) => {
    const item = findById(picturePool, id);
    q.push({ id: item.id, taskType: "describe_picture", prompt: "Describe the picture in as much detail as you can.", imageUrl: item.imageUrl, imageAlt: item.alt, prepSeconds: 45, responseSeconds: 30, metadata: { scene: item.scene, concepts: item.concepts, rubric: ["pronunciation", "intonation_stress", "grammar", "vocabulary", "cohesion"], mockSet: set.id } });
  });

  const interview = findById(interviewPool, set.interviewGroup);
  interview.questions.forEach((item) => q.push({ id: item.id, taskType: "respond_questions", prompt: item.prompt, context: interview.intro, prepSeconds: 3, responseSeconds: item.responseSeconds, groupId: interview.id, metadata: { slots: item.slots, topic: interview.topic, rubric: ["delivery", "language_use", "relevance", "completeness"], mockSet: set.id } }));

  const info = findById(infoPool, set.infoGroup);
  info.questions.forEach((item, itemIdx) => q.push({ id: item.id, taskType: "info_response", prompt: item.prompt, context: info.intro, information: info.information, prepSeconds: 3, responseSeconds: item.responseSeconds, studySeconds: itemIdx === 0 ? 45 : 0, repeatPrompt: itemIdx === 2 ? 2 : 1, groupId: info.id, metadata: { expectedFacts: item.expectedFacts, rubric: ["delivery", "language_use", "relevance", "completeness"], mockSet: set.id } }));

  const opinion = findById(opinionPool, set.opinion);
  q.push({ id: opinion.id, taskType: "opinion", prompt: opinion.prompt, prepSeconds: 45, responseSeconds: 60, metadata: { rubric: ["opinion", "support", "coherence", "delivery", "grammar", "vocabulary"], mockSet: set.id } });

  return q.map((item, index) => ({ ...item, number: index + 1 }));
}
