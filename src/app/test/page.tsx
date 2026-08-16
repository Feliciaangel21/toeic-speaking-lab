import TestRunner from "@/components/TestRunner";
export default async function TestPage({ searchParams }: { searchParams: Promise<{ set?: string }> }) { const p = await searchParams; const n = Math.max(1, Math.min(15, Number(p.set) || 1)); return <TestRunner setNumber={n}/>; }
