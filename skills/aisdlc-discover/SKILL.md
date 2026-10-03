---
name: aisdlc-discover
description: Double-Diamond discovery intake for a new idea in the standard or regulated lane. Use when the idea is vague, the user says "I want to build" or "new feature", or `aisdlc next` reports DISCOVER. Runs JTBD, workaround mining, 5 Whys, How-Might-We, MoSCoW and the riskiest assumption with the aisdlc-grill interview discipline, seeds docs/glossary.md, writes docs/brief.md and seed EARS requirements. Ends in a verdict - build, spike first, defer, or do not build - so a bad idea dies cheaply.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: discover
---

# aisdlc-discover

Turn a fuzzy intention into a brief that a spec can be written from. Ten minutes, no jargon walls, nothing asked that could have been looked up.

## Rules of engagement

- Interview discipline comes from `aisdlc-grill`: facts are your job, decisions are theirs; every question must be able to change the build; always offer a recommended answer or 2-3 example answers so a non-technical person can respond fast.
- **Pacing by audience.** Non-technical user: one question per turn. Technical user or a user who says "batch them": rounds of 3-5 independent questions (the frontier).
- Reflect the answer back in one sentence before moving on. If the user rambles, extract and confirm.
- Stop early when you already have a clear answer from context (brief, README, issues, code, taste). Never ask for its own sake.
- Do not propose architecture here. Discovery is about the problem, not the solution. Park solution ideas in a "Later" list at the bottom of the brief.
- Every domain word the user uses that you had to think about goes into `docs/glossary.md` as `term: one-line meaning`. Shared language cuts every later session's tokens and keeps names consistent in code.

## Before the first question (silent, 2 minutes)

Read `docs/constitution.md`, `docs/taste.md`, `docs/glossary.md`, existing briefs, the README, and `git log -20 --oneline`. In an existing repo, skim the entrypoints the idea would touch. Write down the facts; you will not ask about them.

## The diamond, question by question

### Discover (diverge on the problem)
1. **Job story (JTBD):** "When ___, I want to ___, so I can ___." Who is the person, what situation are they in?
2. **Today's workaround:** How do they get this done now? What breaks? (Workaround mining is the fastest route to real requirements.)
3. **5 Whys (do three):** Why does this matter? ... and why does *that* matter? Stop when you hit a business or human outcome.

### Define (converge on a problem statement)
4. **Problem statement:** "[User] needs a way to [goal] because [reason]." Write it, ask for a yes/edit.
5. **How Might We:** Rephrase as one HMW question. Confirm.
6. **Kind:** frontend, backend, mobile, data, ml, infra, docs, lib, other. This decides how the work is verified later. Recommend one from what you read.

### Develop (diverge on scope)
7. **MoSCoW:** Must / Should / Could / Won't. Push for at most 3 to 5 must-haves. Each must-have becomes a seed requirement.
8. **Riskiest assumption:** What, if false, kills the idea? How could we test it cheaply first? (If the test is cheap, propose a `spike` lane feature for it before the main work.)
9. **Non-functional needs (ask only the ones the kind makes relevant):** who must *not* be able to do this (auth), what data is personal (privacy), how fast is fast enough (a number), how many users/records (scale), what must survive a crash (durability), accessibility bar, offline?

### Deliver (converge on the first slice)
10. **First observable win:** What is the smallest thing that, once working, the user would show someone?
11. **Constraints:** Deadlines, budgets, compliance, must-never-change systems, languages the team already knows.
12. **Rejection criteria:** "What would make you send this back?" Ask it last; it is the most revealing question.

Optional, only when it can change the verdict:
- **Alternatives (ask only if the answer is not obvious from the workaround question):** what else was considered — buying it, integrating it, doing it by hand, doing nothing? "Do nothing" is a real competitor and often the honest one.
- **PR-FAQ (user-facing `standard`/`regulated` work, one page max):** a fake press release for the finished thing plus six FAQs a stranger would ask. Working Backwards: if the release paragraph is boring, the feature is boring. Park it in the brief; it is not an artifact any gate reads.

If the work touches an **existing repository**, load `aisdlc-brownfield` after question 12 before writing the brief.

## The verdict

Discovery ends in one of four outcomes, and you must say which one you are returning. Producing a brief for an idea that should not be built is the most expensive failure this skill has.

| verdict | when | what you do next |
|---|---|---|
| **build** | the problem is real, the riskiest assumption is cheap to test or already tested | write the brief, seed requirements, hand to `aisdlc-spec` |
| **spike first** | the riskiest assumption is *not* tested and a probe would settle it | open a `spike` lane feature for the probe (`npx aisdlc-cli new ... --lane spike`); the main feature waits for the answer |
| **defer** | real, but blocked by a date, a dependency, or something more important | write the brief anyway, mark it `status: deferred` in the brief, stop |
| **do not build** | the workaround is fine, the rejection criteria are already met today, the assumption fails, or nobody will use it | write one short paragraph — what was believed, what was learned, what evidence killed it — into `docs/brief.md` under `## Verdict`, and stop. No feature folder. |

Ask for a yes on the verdict before you route. "Do not build" needs the human's agreement too; your job is the evidence, theirs is the call.

## Output: `docs/brief.md`

```markdown
# Brief: <title>

## Verdict
build | spike first | defer | do not build — <one sentence, evidence-linked>

## Job story
When <situation>, <user> wants to <motivation>, so they can <outcome>.

## Problem statement
<User> needs a way to <goal> because <reason>.

## How might we
HMW <question>?

## Why it matters (5 Whys)
1. ...  2. ...  3. ...

## Kind and lane
kind: <kind>  (verify model: <hint from aisdlc kinds>) · lane: <quick|standard|regulated> because <reason>

## Scope (MoSCoW)
Must: ...
Should: ...
Could: ...
Won't (this release): ...

## Alternatives considered
<including "do nothing" — one line each>

## Riskiest assumption
<assumption> · cheapest test: <test> · spike first? <yes/no>

## Non-functional needs
auth: ... · privacy: ... · performance: <number> · scale: <number> · durability: ... · a11y: ... · offline: ...

## First observable win
<slice>

## Constraints
- ...

## Rejection criteria
- <what would make the user send it back>

## PR-FAQ (optional, user-facing work)
<one-paragraph press release; six FAQs>

## Facts established (not asked)
- <fact> (source: file/command)

## Seed requirements (EARS, to be refined in the spec)
- WHEN <trigger> THE SYSTEM SHALL <response>.
- IF <unwanted condition> THEN THE SYSTEM SHALL <response>.

## Later (parked solution ideas)
- ...
```

Then:
1. Append new terms to `docs/glossary.md` (create it if missing: `# Glossary` then `- **term**: meaning`).
2. For the **build** verdict only: run `npx aisdlc-cli new "<title>" --kind <kind> --lane <lane>` if the feature folder does not exist yet, paste the seed requirements into `spec.md` §3 and the non-functional needs into §4 Constraints, then hand off to `aisdlc-spec`.
3. For **spike first**: open the spike feature and hand off to `aisdlc-brainstorm`'s spike path (or `aisdlc-spec` in spike mode). The main feature does not start until the probe reports.
4. For **defer** / **do not build**: stop after the brief. Nothing downstream runs.
5. Load `aisdlc-taste` once per project if `docs/taste.md` is missing (six questions max) — only on the `build` path.
