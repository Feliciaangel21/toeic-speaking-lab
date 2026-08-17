import TestRunner from "@/components/TestRunner";
import { getPracticeSet, getPracticeGuides } from "@/lib/question-bank-db";
import type { PracticeHelp } from "@/components/PracticeCoach";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const params = await searchParams;
  const setNumber = Math.max(1, Math.min(15, Number(params.set) || 1));
  const questions = await getPracticeSet(setNumber);
  const guides = await getPracticeGuides(questions.map((q) => q.id)) as Record<string, PracticeHelp>;
  return <TestRunner mode="practice" setNumber={setNumber} questions={questions} guides={guides} />;
}
