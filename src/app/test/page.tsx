import TestRunner from "@/components/TestRunner";
import { getMockSet } from "@/lib/question-bank-db";

export default async function TestPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const p = await searchParams;
  const n = Math.max(1, Math.min(15, Number(p.set) || 1));
  const questions = await getMockSet(n);
  return <TestRunner setNumber={n} questions={questions}/>;
}
