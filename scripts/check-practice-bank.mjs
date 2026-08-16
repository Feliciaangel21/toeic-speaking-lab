import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const practice = JSON.parse(fs.readFileSync(path.join(root, "scripts/practice-question-bank.json"), "utf8"));
const mock = JSON.parse(fs.readFileSync(path.join(root, "scripts/question-bank.json"), "utf8"));
const words = (text = "") => (text.match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) ?? []).length;
const idsFrom = (bank) => [
  ...bank.readAloud.map((x) => x.id),
  ...bank.pictures.map((x) => x.id),
  ...bank.interviewGroups.flatMap((g) => g.questions.map((q) => q.id)),
  ...bank.infoGroups.flatMap((g) => g.questions.map((q) => q.id)),
  ...bank.opinions.map((x) => x.id),
];

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(practice.readAloud.length === 30, `readAloud count=${practice.readAloud.length}, expected 30`);
expect(practice.pictures.length === 30, `pictures count=${practice.pictures.length}, expected 30`);
expect(practice.interviewGroups.length === 15, `interviewGroups count=${practice.interviewGroups.length}, expected 15`);
expect(practice.infoGroups.length === 15, `infoGroups count=${practice.infoGroups.length}, expected 15`);
expect(practice.opinions.length === 15, `opinions count=${practice.opinions.length}, expected 15`);

for (const item of practice.readAloud) {
  const count = words(item.text);
  expect(count >= 90 && count <= 100, `${item.id} has ${count} words; Q1-2 target is 90-100`);
}
for (const item of practice.pictures) {
  const count = words(item.sampleAnswer);
  expect(count >= 50 && count <= 72, `${item.id} sample has ${count} words; Q3-4 target is 50-72`);
  expect(Boolean(item.imageUrl && item.alt && item.scene), `${item.id} missing stable image metadata`);
}
for (const group of practice.interviewGroups) {
  expect(group.questions.length === 3, `${group.id} must have 3 questions`);
  group.questions.forEach((q, i) => {
    expect(q.responseSeconds === (i < 2 ? 15 : 30), `${q.id} responseSeconds=${q.responseSeconds}`);
    const count = words(q.sampleAnswer);
    if (i < 2) expect(count >= 18 && count <= 32, `${q.id} sample has ${count} words; Q5-6 target is 18-32`);
    else expect(count >= 50 && count <= 68, `${q.id} sample has ${count} words; Q7 target is 50-68`);
  });
}
for (const group of practice.infoGroups) {
  expect(group.questions.length === 3, `${group.id} must have 3 questions`);
  const sourceText = JSON.stringify(group.information).toLowerCase();
  group.questions.forEach((q, i) => {
    expect(q.responseSeconds === (i < 2 ? 15 : 30), `${q.id} responseSeconds=${q.responseSeconds}`);
    expect(Array.isArray(q.expectedFacts) && q.expectedFacts.length > 0, `${q.id} missing expectedFacts`);
    for (const fact of q.expectedFacts) {
      const normalized = String(fact).toLowerCase();
      // Semantic facts such as "free" may be expressed in a note sentence; require literal support somewhere.
      expect(sourceText.includes(normalized.replace(/^approximately\s+/, "")) || sourceText.includes(normalized), `${q.id} expected fact not visible in its sheet: ${fact}`);
    }
    const count = words(q.sampleAnswer);
    expect(count >= 5 && count <= 48, `${q.id} sample has ${count} words; Q8-10 answer is implausibly long/short`);
  });
}
for (const item of practice.opinions) {
  const count = words(item.sampleAnswer);
  expect(count >= 105 && count <= 125, `${item.id} sample has ${count} words; Q11 target is 105-125`);
}

const practiceIds = idsFrom(practice);
const mockIds = new Set(idsFrom(mock));
expect(new Set(practiceIds).size === 165, `practice unique question IDs=${new Set(practiceIds).size}, expected 165`);
expect(practiceIds.length === 165, `practice question opportunities=${practiceIds.length}, expected 165`);
expect(practiceIds.every((id) => !mockIds.has(id)), "practice question IDs overlap the mock bank");

for (let set = 1; set <= 15; set += 1) {
  const expected = [
    practice.readAloud[(set - 1) * 2]?.id,
    practice.readAloud[(set - 1) * 2 + 1]?.id,
    practice.pictures[((set - 1) * 2 + 14) % 30]?.id,
    practice.pictures[((set - 1) * 2 + 15) % 30]?.id,
    ...practice.interviewGroups[set - 1].questions.map((q) => q.id),
    ...practice.infoGroups[set - 1].questions.map((q) => q.id),
    practice.opinions[set - 1]?.id,
  ];
  expect(expected.length === 11 && expected.every(Boolean), `Practice Set ${set} does not resolve to 11 questions`);
}

if (failures.length) {
  console.error(`Practice bank QA FAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Practice bank QA PASS");
console.log("15 practice sets × 11 questions = 165 unique practice questions");
console.log("Q1-2: 30 original 90-100 word passages");
console.log("Q3-4: 30 coached photo items");
console.log("Q5-7: 15 original interview scenarios / 45 questions");
console.log("Q8-10: 15 original information sheets / 45 questions");
console.log("Q11: 15 original prompts with 105-125 word model answers");
