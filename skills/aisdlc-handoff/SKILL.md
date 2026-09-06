---
name: aisdlc-handoff
description: Compact the current session into a handoff document so a fresh session, a different agent, or a human can continue without loss. Use when the user says "handoff", "hand off", "save progress", "I need to stop", "context is getting long", "continue this tomorrow", "pass this to", before /compact or /clear, when the context window is over ~70% full, or at the end of any stage that took more than one session. Writes docs/features/<slug>/handoff.md; aisdlc-flow reads it on the next start. Disk is state, chat is not.
license: MIT
metadata:
  author: aisdlc
  version: "2.0"
  stage: any
---

# aisdlc-handoff

Everything the process needs is already on disk (spec, plan, tasks, evidence). What is *not* on disk is the working knowledge in your context: what you tried, what surprised you, what you decided and why, and what the very next keystroke should be. Write that down before it is lost.

## When to fire it (without being asked)

- Context usage is high and there is more than one task left.
- You are about to `/compact`, `/clear`, or the platform will reset.
- A stage boundary was crossed after a long session (spec signed, G1 approved, G3 green).
- You are blocked on a human (approval, credential, decision) and the wait may span sessions.
- The user is leaving.

## Procedure

1. Run `npx aisdlc-cli next <slug> --json` (or read `tasks.md`/`spec.md` directly if the CLI is unavailable). The **state comes from disk**; do not write a state that the files do not support.
2. Write `docs/features/<slug>/handoff.md` (overwrite; git keeps history). If there is no feature yet, write `docs/handoff.md`.
3. Keep it under ~80 lines. Facts, not narrative. Paths, not descriptions. Commands, not intentions.
4. Reply with the path and the single next action.

## File contract: `handoff.md`

```markdown
# Handoff: <feature title>
Written: <ISO timestamp> · by: <agent/model or human> · lane: <lane> · state (from disk): <STATE> · owner: <agent|human>

## Goal in one sentence
<user's words>

## Where we are
- Next task: T<n> <title> [R:<Requirement>]
- Gates: G1 ● G2 ● G3 ○ G4 ○ G5 ○ G6 ○
- Blocking: <copied from `aisdlc next`, or "none">

## Decisions made this session (and why)
- D1 <decision> because <reason> (also recorded in plan.md §Decisions / delta D2 / ADR path)

## Tried and rejected
- <approach> → <why it failed / what it cost> (evidence: evidence/<file>)

## Surprises / gotchas
- <thing the next session must know: env quirk, flaky test, hidden coupling, naming trap>

## Files touched (uncommitted or in flight)
- path — one line on what changed

## Exact next steps
1. <command or edit, copy-pasteable>
2. ...

## Waiting on humans
- <who> to <do what> (`npx aisdlc-cli approve G1 <slug> --by "<name>"` / sign §5 / provide <credential name, never the value>)

## Open questions
- [NEEDS CLARIFICATION: ...]
```

## Rules

- **Never invent progress.** If a test was not run in this session, it is not "passing" in the handoff; link the evidence file or say `IMPLEMENTED-NOT-VERIFIED`.
- **No secrets.** Names of environment variables, never values. `npx aisdlc-cli scan` before you finish.
- **Record decisions in their home too.** The handoff is a pointer; `plan.md`, deltas, and ADRs are the record. If a decision lives only in the handoff, move it now.
- **Prefer the project's language.** Use terms from `docs/glossary.md` so the next reader (human or agent) decodes it fast.

## On resume (what `aisdlc-flow` does with it)

The router reads `handoff.md` if it is newer than the last evidence file or approval, trusts the disk over the handoff for *state*, and uses the handoff only for *context* (decisions, gotchas, next steps). After the first successful step in the new session, the stale sections are removed or the file is rewritten.
