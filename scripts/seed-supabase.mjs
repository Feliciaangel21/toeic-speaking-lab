import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
const sb = createClient(url, key, { auth: { persistSession: false } });
const bank = JSON.parse(await readFile(new URL("./question-bank.json", import.meta.url), "utf8"));
const rows = [];
for (const item of bank.readAloud) rows.push({id:item.id,kind:"read_aloud",payload:item});
for (const item of bank.pictures) rows.push({id:item.id,kind:"describe_picture",payload:item});
for (const item of bank.interviewGroups) rows.push({id:item.id,kind:"respond_questions_group",payload:item});
for (const item of bank.infoGroups) rows.push({id:item.id,kind:"info_response_group",payload:item});
for (const item of bank.opinions) rows.push({id:item.id,kind:"opinion",payload:item});
const { error } = await sb.from("question_bank").upsert(rows, { onConflict: "id" });
if (error) throw error;
console.log(`Seeded ${rows.length} bank records.`);
