import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
const sb = createClient(url, key, { auth: { persistSession: false } });

const mock = JSON.parse(await readFile(new URL("./question-bank.json", import.meta.url), "utf8"));
const practice = JSON.parse(await readFile(new URL("./practice-question-bank.json", import.meta.url), "utf8"));
const banks = [["mock", mock], ["practice", practice]];

const rows = [];
for (const [bankName, bank] of banks) {
  const add = (item, kind) => rows.push({
    id: item.id,
    kind,
    payload: { ...item, bank: bankName },
    active: true,
  });
  for (const item of bank.readAloud) add(item, "read_aloud");
  for (const item of bank.pictures) add(item, "describe_picture");
  for (const item of bank.interviewGroups) add(item, "respond_questions_group");
  for (const item of bank.infoGroups) add(item, "info_response_group");
  for (const item of bank.opinions) add(item, "opinion");
}

for (let i = 0; i < rows.length; i += 25) {
  const { error } = await sb.from("question_bank").upsert(rows.slice(i, i + 25), { onConflict: "id" });
  if (error) throw error;
}

const practiceSets = Array.from({ length: 15 }, (_, i) => {
  const questionIds = [
    practice.readAloud[i * 2].id,
    practice.readAloud[i * 2 + 1].id,
    practice.pictures[(i * 2 + 14) % 30].id,
    practice.pictures[(i * 2 + 15) % 30].id,
    ...practice.interviewGroups[i].questions.map((q) => q.id),
    ...practice.infoGroups[i].questions.map((q) => q.id),
    practice.opinions[i].id,
  ];
  return {
    id: `practice-${String(i + 1).padStart(2, "0")}`,
    set_number: i + 1,
    payload: { bank: "practice", version: "v5", question_ids: questionIds, question_count: 11 },
    active: true,
  };
});
const { error: setError } = await sb.from("practice_sets").upsert(practiceSets, { onConflict: "id" });
if (setError) throw setError;

console.log(`Seeded ${rows.length} question-bank records and ${practiceSets.length} Practice set definitions.`);
