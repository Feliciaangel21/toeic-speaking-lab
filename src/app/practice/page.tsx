import TestRunner from "@/components/TestRunner";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ set?: string }> }) {
  const params = await searchParams;
  const setNumber = Math.max(1, Math.min(15, Number(params.set) || 1));
  return <TestRunner mode="practice" setNumber={setNumber} />;
}
