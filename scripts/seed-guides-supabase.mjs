import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for this one-time admin seed.");
const supabase = createClient(url, service, { auth: { persistSession: false } });
const guides = JSON.parse(fs.readFileSync(new URL("./practice-guides.json", import.meta.url), "utf8"));
for (let i=0;i<guides.length;i+=25) {
  const rows=guides.slice(i,i+25).map(({question_id,...payload})=>({question_id,payload,updated_at:new Date().toISOString()}));
  const { error }=await supabase.from("practice_guides").upsert(rows,{onConflict:"question_id"});
  if(error) throw error;
}
console.log(`Seeded ${guides.length} Korean practice guides.`);
