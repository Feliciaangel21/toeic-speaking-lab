#!/usr/bin/env node
/**
 * Pull the exact current live V6 TOEIC content from Supabase.
 *
 * READ ONLY against Supabase.
 *
 * Outputs:
 *   supabase/migrations/20260817_live_v6_content_sync.sql
 *   model-service/data/question-bank.json
 *   model-service/data/practice-question-bank.json
 *   live-v6-sync-report.json
 *
 * Usage:
 *   node scripts/sync-live-v6.mjs
 *   node scripts/sync-live-v6.mjs --verify-only
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const VERIFY_ONLY = process.argv.includes("--verify-only");

function loadEnvFile(filename) {
  const p = path.join(ROOT, filename);
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
  process.exit(1);
}

async function rest(table, params = {}) {
  const u = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
      Prefer: "count=exact",
    },
  });
  if (!res.ok) {
    throw new Error(`${table}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function words(s) {
  return String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function fail(message, details) {
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : "";
  throw new Error(`${message}${suffix}`);
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const s =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
  return `'${s.replaceAll("'", "''")}'`;
}

function buildUpsert(table, row, conflictKey) {
  const cols = Object.keys(row);
  const values = cols.map((c) => {
    const value = row[c];
    if (c === "payload") return `${sqlLiteral(value)}::jsonb`;
    return sqlLiteral(value);
  });
  const updates = cols
    .filter((c) => c !== conflictKey && c !== "created_at")
    .map((c) => `${c}=excluded.${c}`)
    .join(", ");
  return `insert into public.${table} (${cols.join(", ")}) values (${values.join(", ")}) on conflict (${conflictKey}) do update set ${updates};`;
}

function recursivelyMergeById(node, payloadById) {
  if (Array.isArray(node)) {
    return node.map((item) => recursivelyMergeById(item, payloadById));
  }
  if (!node || typeof node !== "object") return node;

  let current = node;
  if (typeof node.id === "string" && payloadById.has(node.id)) {
    // Preserve any model-service-only properties while refreshing every field
    // that exists in the live question payload.
    current = { ...node, ...payloadById.get(node.id) };
  }
  return Object.fromEntries(
    Object.entries(current).map(([k, v]) => [k, recursivelyMergeById(v, payloadById)])
  );
}

function syncModelBank(filePath, rows, bank) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Model-service bank not found: ${filePath}`);
  }
  const original = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const payloadById = new Map(
    rows
      .filter((r) => r.payload?.bank === bank)
      .map((r) => [r.id, r.payload])
  );
  const merged = recursivelyMergeById(original, payloadById);

  // Guard: every live top-level ID for this bank must exist in the Git bank.
  const seen = new Set();
  (function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    if (typeof node.id === "string") seen.add(node.id);
    Object.values(node).forEach(visit);
  })(merged);

  const missing = [...payloadById.keys()].filter((id) => !seen.has(id));
  if (missing.length) {
    fail(`Git model bank is missing ${missing.length} live ${bank} IDs`, missing);
  }

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + "\n");
}

const [questionBank, guides, mockSets, practiceSets] = await Promise.all([
  rest("question_bank", {
    select: "*",
    active: "eq.true",
    order: "id.asc",
  }),
  rest("practice_guides", {
    select: "*",
    order: "question_id.asc",
  }),
  rest("mock_sets", {
    select: "*",
    active: "eq.true",
    order: "set_number.asc",
  }),
  rest("practice_sets", {
    select: "*",
    active: "eq.true",
    order: "set_number.asc",
  }),
]);

// ---------- Release QA ----------
if (questionBank.length !== 210) {
  fail(`Expected 210 active question_bank rows, got ${questionBank.length}`);
}
if (guides.length !== 330) {
  fail(`Expected 330 practice guides, got ${guides.length}`);
}
if (mockSets.length !== 15) {
  fail(`Expected 15 active mock sets, got ${mockSets.length}`);
}
if (practiceSets.length !== 15) {
  fail(`Expected 15 active practice sets, got ${practiceSets.length}`);
}

const readAloud = questionBank.filter((r) => r.kind === "read_aloud");
if (readAloud.length !== 60) fail(`Expected 60 Read Aloud rows, got ${readAloud.length}`);
const raCounts = readAloud.map((r) => ({ id: r.id, words: words(r.payload?.text) }));
const raBad = raCounts.filter((r) => r.words < 85 || r.words > 95);
if (raBad.length) fail("Read Aloud word-count gate failed", raBad);
if (new Set(readAloud.map((r) => r.payload?.text)).size !== 60) {
  fail("Read Aloud passages are not all unique");
}

const pictures = questionBank.filter((r) => r.kind === "describe_picture");
if (pictures.length !== 60) fail(`Expected 60 pictures, got ${pictures.length}`);
if (new Set(pictures.map((r) => r.payload?.imageUrl)).size !== 60) {
  fail("Picture URLs are not all unique");
}
const pictureAuditBad = pictures
  .filter((r) => r.payload?.visualAudit?.status !== "pass")
  .map((r) => r.id);
if (pictureAuditBad.length) fail("Some pictures do not have visualAudit.status=pass", pictureAuditBad);

const infoGroups = questionBank.filter((r) => r.kind === "info_response_group");
if (infoGroups.length !== 30) fail(`Expected 30 Q8–10 groups, got ${infoGroups.length}`);
const badInfo = [];
for (const row of infoGroups) {
  const info = row.payload?.information;
  if (!Array.isArray(info?.columns) || info.columns.length < 2) {
    badInfo.push({ id: row.id, reason: "missing columns" });
    continue;
  }
  for (const [i, item] of (info.rows ?? []).entries()) {
    if (!Array.isArray(item.cells) || item.cells.length !== info.columns.length) {
      badInfo.push({ id: row.id, row: i, reason: "cells/header mismatch" });
    }
  }
}
if (badInfo.length) fail("Structured Q8–10 gate failed", badInfo);

const opinions = questionBank.filter((r) => r.kind === "opinion");
if (opinions.length !== 30) fail(`Expected 30 Q11 rows, got ${opinions.length}`);
const q11Bad = opinions
  .map((r) => ({ id: r.id, words: words(r.payload?.sampleAnswer) }))
  .filter((r) => r.words < 125 || r.words > 145);
if (q11Bad.length) fail("Q11 sample-answer length gate failed", q11Bad);

// Exact practice guide parity for direct-answer question types.
const guideMap = new Map(guides.map((g) => [g.question_id, g.payload]));
const parityBad = [];
for (const row of questionBank) {
  if (!["read_aloud", "describe_picture", "opinion"].includes(row.kind)) continue;
  const expected =
    row.kind === "read_aloud"
      ? row.payload?.text
      : row.payload?.sampleAnswer;
  const actual = guideMap.get(row.id)?.sampleAnswer;
  if (actual !== expected) parityBad.push(row.id);
}
if (parityBad.length) fail("Guide/sample parity failed", parityBad);

const report = {
  generatedAt: new Date().toISOString(),
  source: SUPABASE_URL,
  questionBankActive: questionBank.length,
  practiceGuides: guides.length,
  mockSetsActive: mockSets.length,
  practiceSetsActive: practiceSets.length,
  readAloud: {
    rows: readAloud.length,
    minWords: Math.min(...raCounts.map((x) => x.words)),
    maxWords: Math.max(...raCounts.map((x) => x.words)),
    uniquePassages: new Set(readAloud.map((r) => r.payload?.text)).size,
  },
  pictures: {
    rows: pictures.length,
    uniqueUrls: new Set(pictures.map((r) => r.payload?.imageUrl)).size,
    visualAuditPass: pictures.filter((r) => r.payload?.visualAudit?.status === "pass").length,
  },
  infoQ8to10: {
    groups: infoGroups.length,
    structuredGroups: infoGroups.filter((r) => Array.isArray(r.payload?.information?.columns)).length,
  },
  q11: {
    rows: opinions.length,
    minWords: Math.min(...opinions.map((r) => words(r.payload?.sampleAnswer))),
    maxWords: Math.max(...opinions.map((r) => words(r.payload?.sampleAnswer))),
  },
  guideParityErrors: parityBad.length,
};

console.log(JSON.stringify(report, null, 2));

if (VERIFY_ONLY) {
  console.log("\nVerification passed. No files written.");
  process.exit(0);
}

// ---------- Reproducible SQL snapshot ----------
const migrationPath = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260817_live_v6_content_sync.sql"
);
fs.mkdirSync(path.dirname(migrationPath), { recursive: true });

const sql = [
  "-- Generated by scripts/sync-live-v6.mjs",
  `-- Generated at ${report.generatedAt}`,
  "-- Source of truth: current live Supabase active V6 content.",
  "begin;",
  "",
  "-- Question bank",
  ...questionBank.map((r) => buildUpsert("question_bank", r, "id")),
  "",
  "-- Practice guides",
  ...guides.map((r) => buildUpsert("practice_guides", r, "question_id")),
  "",
  "-- Mock set registry",
  ...mockSets.map((r) => buildUpsert("mock_sets", r, "id")),
  "",
  "-- Practice set registry",
  ...practiceSets.map((r) => buildUpsert("practice_sets", r, "id")),
  "",
  "commit;",
  "",
].join("\n");

fs.writeFileSync(migrationPath, sql);

// ---------- Refresh model-service scoring reference ----------
syncModelBank(
  path.join(ROOT, "model-service", "data", "question-bank.json"),
  questionBank,
  "mock"
);
syncModelBank(
  path.join(ROOT, "model-service", "data", "practice-question-bank.json"),
  questionBank,
  "practice"
);

fs.writeFileSync(
  path.join(ROOT, "live-v6-sync-report.json"),
  JSON.stringify(report, null, 2) + "\n"
);

console.log("\nWrote:");
console.log(`- ${path.relative(ROOT, migrationPath)}`);
console.log("- model-service/data/question-bank.json");
console.log("- model-service/data/practice-question-bank.json");
console.log("- live-v6-sync-report.json");
