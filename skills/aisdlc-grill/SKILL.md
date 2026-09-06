---
name: aisdlc-grill
description: Relentless, structured interview that turns a vague plan, idea, spec, or design into shared understanding before anything is built. Use whenever the user says "grill me", "interview me", "poke holes", "stress-test this", "what am I missing", or when any aisdlc stage (discover, spec, plan, delta, retro) needs decisions from a human. Works the design tree in rounds, gives a recommended answer with every question, finds facts itself instead of asking, and writes every settled decision to disk. Delegates to the official `grilling` skill (mattpocock/skills) when it is installed.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: any
  companion: mattpocock/skills#grilling
---

# aisdlc-grill: the interview primitive

Most work fails in specification, not execution. The human has the full picture in their head; the request captures 20% of it. Ten good questions cost two minutes and save two hours. Every other aisdlc skill calls this one when it needs a decision.

## 0. Companion resolution (do this first, silently)

1. If a skill named `grilling` (mattpocock/skills) is available to you, invoke it and then **apply the aisdlc overlay** in §4 (decisions land on disk, not just in chat).
2. Otherwise check the repo: `.agents/skills/grilling/SKILL.md`, `.claude/skills/grilling/SKILL.md`, `.cursor/skills/grilling/SKILL.md`. If found, read it and follow it plus §4.
3. Otherwise run the embedded procedure below. It is a faithful superset; nothing is lost. Tell the user once: "official `grilling` not installed; using aisdlc's built-in interview. Install with `npx aisdlc-cli addon grilling`."

## 1. The design tree and the frontier

Model the subject as a **design tree**: every decision branches into decisions that hang off it. The **frontier** is the set of questions whose prerequisites are already settled: the ones you can ask *now* without guessing at answers you have not heard.

- Ask the **whole frontier in one round**. Number the questions. Wait for answers.
- A question whose answer depends on another question still open in this round belongs to the **next** round.
- Each answer reshapes the tree: settled decisions push the frontier outward. Recompute and ask the next round.
- The session is done when the frontier is empty: every branch visited, nothing silently assumed.

Round format (use exactly this so answers can be given by number):

```
❓ **Q1 · <title>**: <question; include 2-3 concrete options when possible>
➡️ Recommended: <your call + one-sentence why>

---

❓ **Q2 · <title>**: ...
➡️ Recommended: ...
```

## 2. Rules that make the interview worth the human's time

1. **Every question must be able to change the build.** Before asking, know what you would do differently for each plausible answer. If all answers lead to the same decision, cut it.
2. **Facts are your job. Decisions are theirs.** If the answer lives in the filesystem, git log, docs, a running command, or the web, go get it. Never ask a human something `grep` can answer. Report what you found and ask only for the decision on top of it.
3. **Always give a recommended answer.** "What do you think?" is lazy. A recommendation plus a one-line reason moves the session forward and exposes your assumptions so they can be corrected.
4. **Adapt depth to stakes.** A throwaway script earns one round of 3-5 questions. A client-facing product or a data migration earns three rounds of 4-6. Say the budget out loud at the start ("I'll do about two rounds") and let the user change it.
5. **Batch, do not barrage.** Rounds of 4-6, never 15 at once, never one-at-a-time drip when several are independent. (Exception: non-technical users in `aisdlc-discover` get one question per turn; that skill says so.)
6. **Reflect before you proceed.** Start every new round with a two-line summary of what was settled in the previous one. If the user rambles, extract and confirm in one sentence.
7. **Stop early when you already know.** Context, brief, taste profile, prior ADRs and the codebase all count as answers. Never ask for its own sake.
8. **Do not solve during the interview.** Recommendations are one line. Architecture, code and plans come after the frontier is empty.

## 3. Coverage map (draw from, weighted by stakes; never force every area)

| area | the question that usually matters |
|---|---|
| Purpose | Who has the problem, in what situation, and what does "solved" look like to them? |
| Scope | What is explicitly out for this iteration? What must not change? |
| Users & access | Who else touches this: roles, permissions, anonymous, admins, other systems? |
| Data | Where does the truth live, what shape, what volume, what retention, what is PII? |
| Failure & edges | What does "wrong" look like? Empty, huge, duplicate, concurrent, offline, partial? |
| Integration | What existing flows, APIs, jobs, or schemas does this touch? Seams already there? |
| Constraints | Deadline, budget, compliance, languages the team knows, hosting, licensing. |
| Verification | What single command or observation would convince a stranger it works? |
| Taste | Examples they love or hate. Density, tone, level of ceremony. |
| Lifecycle | One-off or maintained? By whom? Expected growth? |
| **Rejection criteria** | *What would make you send this back?* (The most revealing question; ask it near the end.) |

## 4. aisdlc overlay: decisions go to disk

Chat is not state. When the frontier is empty:

1. Write **every settled decision** into the artifact the calling stage owns:
   - discover → `docs/brief.md` (and new terms to `docs/glossary.md`)
   - spec → `spec.md` §3 requirements / §6 open questions (mark unresolved ones `[NEEDS CLARIFICATION: ...]`)
   - plan → `plan.md` `## Decisions` table (decision, alternatives, why)
   - delta → `deltas/D<n>-*.md`
   - anything else → `docs/decisions/<yyyy-mm-dd>-<slug>.md` (ADR: context, decision, consequences)
2. Print a **decision ledger**: `D1 <decision> (Q3)`, one line each. Ask: "Shared understanding? yes / edit". Do not act until the answer is yes.
3. If the user said "just build it" mid-interview: record the remaining questions as `[NEEDS CLARIFICATION]` rows, state the defaults you will take, and proceed only if the lane allows it (`spike` or `quick`). `standard`/`regulated` lanes block on an unsigned spec by design.

## 5. Ways to invoke

- `grill me on <plan|spec|design|this>`: full session on the named subject.
- `grill the spec`: adversarial pass over `spec.md`; every requirement gets "what input breaks this? what does the scenario not cover?".
- `grill the plan`: every decision in `plan.md` gets "what is the alternative and why not?" plus a ponytail check ("is there a lazier design that meets the spec?").
- `quick grill`: one round, five questions max, for `quick` lane work.

## Anti-patterns you must refuse

- Asking the user to confirm facts you could have read.
- A round with no recommendations.
- Continuing to build while "waiting" for answers.
- Ending the session without writing decisions to a file.
