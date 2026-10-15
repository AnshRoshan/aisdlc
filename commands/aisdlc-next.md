---
description: Derive aisdlc state from disk and do the one next thing
argument-hint: [feature-slug]
---

Run `npx aisdlc-cli next $ARGUMENTS --json` (or `npx aisdlc-cli next --json` if no slug was given). Treat its output as the only source of truth for where the feature is; never infer state from chat history.

Read the returned JSON: `state`, `lane`, `blocking[]`, `skill`, `owner`, `nextTask`. Then:

1. If `owner` is `human`, stop and ask for exactly that action. Never simulate approvals, signatures or evidence.
2. Otherwise load the skill named in `skill` and do its next action.
3. When the work for this stage is done, run `npx aisdlc-cli next $ARGUMENTS --json` again to confirm the transition happened on disk, and paste its output.

If the CLI is unavailable, load `aisdlc-flow` and read its `references/manual-derivation.md` in full. Report tentative state only; never fabricate approvals, signatures or CLI evidence.
