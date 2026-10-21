---
description: Derive arsdlc state from disk and do the one next thing
argument-hint: [feature-slug]
---

Run `npx arsdlc next $ARGUMENTS --json` (or `npx arsdlc next --json` if no slug was given). Treat its output as the only source of truth for where the feature is; never infer state from chat history.

Read the returned JSON: `state`, `lane`, `blocking[]`, `skill`, `owner`, `nextTask`. Then:

1. If `owner` is `human`, stop and ask for exactly that action. Never simulate approvals, signatures or evidence.
2. Otherwise load the skill named in `skill` and do its next action.
3. When the work for this stage is done, run `npx arsdlc next $ARGUMENTS --json` again to confirm the transition happened on disk, and paste its output.

If the CLI is unavailable, load `arsdlc-flow` and read its `references/manual-derivation.md` in full. Report tentative state only; never fabricate approvals, signatures or CLI evidence.
