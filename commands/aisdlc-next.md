---
description: Derive aisdlc state from disk and do the one next thing
argument-hint: [feature-slug]
---

Run `npx aisdlc next $ARGUMENTS --json` (or `npx aisdlc next --json` if no slug was given). Treat its output as the only source of truth for where the feature is; never infer state from chat history.

Read the returned JSON: `state`, `lane`, `blocking[]`, `skill`, `owner`, `nextTask`. Then:

1. Load the skill named in `skill` and do exactly its next action.
2. If `owner` is `human`, stop and ask the human for exactly that thing. Do not simulate approvals, signatures or evidence.
3. When the work for this stage is done, run `npx aisdlc next $ARGUMENTS --json` again to confirm the transition happened on disk, and paste its output.

If the CLI is unavailable, say "derived manually; CLI unavailable" and follow the manual derivation order in skills/aisdlc-flow/SKILL.md without writing approvals or evidence files by hand.
