import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}

const sb = createClient(url, key, { auth: { persistSession: false } });
console.log(`Checking ${url} ...`);

const { error } = await sb.from("question_bank").select("id").limit(1);
if (!error) {
  console.log("Connected successfully. Schema is reachable and question_bank exists.");
  process.exit(0);
}

if (error.code === "42P01" || /does not exist/i.test(error.message)) {
  console.error("Supabase is reachable, but the app schema has not been applied yet.");
  console.error("Run supabase/schema.sql in the Supabase SQL Editor, then retry.");
  process.exit(2);
}

console.error("Connection/schema check failed:", error.message);
process.exit(1);
