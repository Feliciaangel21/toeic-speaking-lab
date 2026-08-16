# Practice Set QA

## Purpose

Practice Mode now contains 15 full, fixed 11-question practice sets that are separate from the 15 Mock sets. The practice bank is original content modeled on the public TOEIC Speaking task sequence, response windows, and evaluation dimensions; it does not copy ETS sample wording.

## Set structure

Each Practice set contains:

| Questions | Task | Preparation | Response |
|---|---|---:|---:|
| 1–2 | Read a Text Aloud | 45 sec | 45 sec |
| 3–4 | Describe a Picture | 45 sec | 30 sec |
| 5–6 | Respond to Questions | 3 sec | 15 sec |
| 7 | Respond to Questions | 3 sec | 30 sec |
| 8–9 | Respond Using Information | 45 sec information read before Q8; 3 sec question prep | 15 sec |
| 10 | Respond Using Information | 3 sec; question is narrated twice | 30 sec |
| 11 | Express an Opinion | 45 sec | 60 sec |

## Content inventory

Practice-only question IDs:

- 30 original read-aloud passages (`pra01`–`pra30`)
- 30 picture-description practice items (`prpic01`–`prpic30`)
- 15 original interview scenarios / 45 responses (`priq01`–`priq15`)
- 15 original information sheets / 45 responses (`prinfo01`–`prinfo15`)
- 15 original opinion prompts (`prop01`–`prop15`)
- 165 unique Practice question IDs total

Practice IDs do not overlap Mock IDs.

## Authoring gates

- Read-aloud passages: 90–100 word target; current bank is 92–99 words.
- Q5–6 model answers: short direct answers designed for a 15-second window.
- Q7 model answers: direct answer + reason/detail/example designed for a 30-second window.
- Q8–10: every question has explicit `expectedFacts`; sample answers are checked against its own information sheet.
- Q11: model answers are 105–125 words and follow position → reason → example → additional support → conclusion.
- Picture items include scene/concept metadata and a custom 30-second model answer. Stable curated photo assets are reused under separate practice IDs rather than introducing unreliable remote images.

Run the automatic content checks with:

```bash
npm run check:practice
```

## Practice-only controls

### Set selection

Use `/practice?set=1` through `/practice?set=15`. The pre-start screen and home page both expose the set selector.

### Redo / restart

- During study, preparation, narration, or response: `다시 시작` discards the in-progress answer and restarts the same question from its original state.
- On the review screen: `다시 풀기` does the same thing.
- Q8 restarts its 45-second information-reading period.
- Narrated questions are played again before preparation.
- Q10 is narrated twice again.
- The preparation and response timers restart from their full values.

### Skip

`건너뛰기` is Practice-only. It discards any in-progress recording for that question and moves to the next item without creating an attempt for the skipped item.

## Coaching quality

Every Practice question has a custom sample answer in the practice bank. The Korean coaching layer supplies task-specific hints, reusable expressions, response structure, rationale, and evaluation focus. Sample answers remain locked until the learner finishes their own response.

Mock Mode remains exam-only and does not reveal Practice coaching.
