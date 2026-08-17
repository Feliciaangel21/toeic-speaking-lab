import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import type { Question, TaskType } from "./types";

// Question content lives in Supabase (question_bank, mock_sets, practice_sets),
// not in the Next.js bundle. Set registries store each set's 11 question ids in
// exam order already, so building a set is "resolve each id" rather than
// reconstructing set membership. Grouped items (Q5-7, Q8-10) are addressed by a
// "<groupId>-q<N>" id; the group itself is one question_bank row.

type Bank = "mock" | "practice";

type BankRow = { id: string; kind: string; payload: Record<string, any> };
type SetRow = { id: string; payload: { question_ids: string[] } };

const RUBRIC: Record<TaskType, string[]> = {
  read_aloud: ["pronunciation", "intonation_stress"],
  describe_picture: ["pronunciation", "intonation_stress", "grammar", "vocabulary", "cohesion"],
  respond_questions: ["delivery", "language_use", "relevance", "completeness"],
  info_response: ["delivery", "language_use", "relevance", "completeness"],
  opinion: ["opinion", "support", "coherence", "delivery", "grammar", "vocabulary"],
};

function splitGroupId(id: string): { baseId: string; isSub: boolean } {
  const m = id.match(/^(.+)-q\d+$/);
  return m ? { baseId: m[1], isSub: true } : { baseId: id, isSub: false };
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  return supabase;
}

function mapRow(fullId: string, row: BankRow, bank: Bank, setId: string, number: number): Question {
  const p = row.payload;
  const setField = bank === "mock" ? { mockSet: setId } : { practiceSet: setId, contentBank: "practice" as const };
  // Mock questions never carry a sampleAnswer in metadata: PracticeCoach (which
  // would show it) never renders in mock mode, and the exam payload should not
  // ship the answer to the client either way.
  const sample = bank === "practice" && typeof p.sampleAnswer === "string" ? { sampleAnswer: p.sampleAnswer } : {};

  switch (row.kind) {
    case "read_aloud":
      return {
        id: fullId, number, taskType: "read_aloud", prompt: "Read the text aloud.", passage: p.text,
        prepSeconds: 45, responseSeconds: 45,
        metadata: { referenceText: p.text, rubric: RUBRIC.read_aloud, ...setField },
      };
    case "describe_picture":
      return {
        id: fullId, number, taskType: "describe_picture", prompt: "Describe the picture in as much detail as you can.",
        imageUrl: p.imageUrl, imageAlt: p.alt, prepSeconds: 45, responseSeconds: 30,
        metadata: { scene: p.scene, concepts: p.concepts, rubric: RUBRIC.describe_picture, ...setField, ...sample },
      };
    case "respond_questions_group": {
      const items: any[] = p.questions ?? [];
      const item = items.find((q) => q.id === fullId);
      if (!item) throw new Error(`Question-bank item not found: ${fullId}`);
      return {
        id: fullId, number, taskType: "respond_questions", prompt: item.prompt, context: p.intro,
        prepSeconds: 3, responseSeconds: item.responseSeconds, groupId: p.id,
        metadata: { slots: item.slots, topic: p.topic, rubric: RUBRIC.respond_questions, ...setField, ...(bank === "practice" && typeof item.sampleAnswer === "string" ? { sampleAnswer: item.sampleAnswer } : {}) },
      };
    }
    case "info_response_group": {
      const items: any[] = p.questions ?? [];
      const itemIdx = items.findIndex((q) => q.id === fullId);
      if (itemIdx === -1) throw new Error(`Question-bank item not found: ${fullId}`);
      const item = items[itemIdx];
      return {
        id: fullId, number, taskType: "info_response", prompt: item.prompt, context: p.intro, information: p.information,
        prepSeconds: 3, responseSeconds: item.responseSeconds,
        studySeconds: itemIdx === 0 ? 45 : 0, repeatPrompt: itemIdx === 2 ? 2 : 1, groupId: p.id,
        metadata: { expectedFacts: item.expectedFacts, rubric: RUBRIC.info_response, ...setField, ...(bank === "practice" && typeof item.sampleAnswer === "string" ? { sampleAnswer: item.sampleAnswer } : {}) },
      };
    }
    case "opinion":
      return {
        id: fullId, number, taskType: "opinion", prompt: p.prompt, prepSeconds: 45, responseSeconds: 60,
        metadata: { rubric: RUBRIC.opinion, ...setField, ...sample },
      };
    default:
      throw new Error(`Unknown question_bank kind: ${row.kind}`);
  }
}

async function fetchSetQuestions(bank: Bank, setNumber: number): Promise<Question[]> {
  const supabase = requireSupabase();
  const table = bank === "mock" ? "mock_sets" : "practice_sets";
  const { data: setRow, error: setError } = await supabase
    .from(table)
    .select("id,payload")
    .eq("set_number", setNumber)
    .eq("active", true)
    .maybeSingle<SetRow>();
  if (setError) throw setError;
  if (!setRow) throw new Error(`${table}: no active set_number=${setNumber}`);

  const ids = setRow.payload.question_ids;
  const baseIds = [...new Set(ids.map((id) => splitGroupId(id).baseId))];
  const { data: rows, error: rowsError } = await supabase
    .from("question_bank")
    .select("id,kind,payload")
    .in("id", baseIds)
    .eq("active", true)
    .returns<BankRow[]>();
  if (rowsError) throw rowsError;

  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((fullId, index) => {
    const { baseId } = splitGroupId(fullId);
    const row = byId.get(baseId);
    if (!row) throw new Error(`Question-bank item not found: ${baseId}`);
    return mapRow(fullId, row, bank, setRow.id, index + 1);
  });
}

async function fetchQuestionById(fullId: string): Promise<Question | null> {
  const supabase = requireSupabase();
  const { baseId } = splitGroupId(fullId);
  const { data: row, error: rowError } = await supabase
    .from("question_bank")
    .select("id,kind,payload")
    .eq("id", baseId)
    .eq("active", true)
    .maybeSingle<BankRow>();
  if (rowError) throw rowError;
  if (!row) return null;

  const bank: Bank = row.payload.bank === "practice" ? "practice" : "mock";
  const table = bank === "mock" ? "mock_sets" : "practice_sets";
  const { data: sets, error: setsError } = await supabase
    .from(table)
    .select("id,payload")
    .eq("active", true)
    .returns<SetRow[]>();
  if (setsError) throw setsError;

  for (const setRow of sets) {
    const index = setRow.payload.question_ids.indexOf(fullId);
    if (index !== -1) return mapRow(fullId, row, bank, setRow.id, index + 1);
  }
  return null;
}

async function fetchGuides(ids: string[]): Promise<Record<string, unknown>> {
  if (ids.length === 0) return {};
  const supabase = requireSupabase();
  const { data, error } = await supabase.from("practice_guides").select("question_id,payload").in("question_id", ids);
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.question_id, row.payload]));
}

// Question content changes rarely; cache it briefly so a burst of page loads
// doesn't turn into a burst of Supabase reads, while still reading the DB as
// the source of truth rather than the build-time bundle.
const REVALIDATE_SECONDS = 300;

export const getMockSet = unstable_cache(
  (setNumber: number) => fetchSetQuestions("mock", setNumber),
  ["mock-set"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPracticeSet = unstable_cache(
  (setNumber: number) => fetchSetQuestions("practice", setNumber),
  ["practice-set"],
  { revalidate: REVALIDATE_SECONDS },
);

export const findQuestionById = unstable_cache(
  fetchQuestionById,
  ["question-by-id"],
  { revalidate: REVALIDATE_SECONDS },
);

export const getPracticeGuides = unstable_cache(
  fetchGuides,
  ["practice-guides"],
  { revalidate: REVALIDATE_SECONDS },
);
