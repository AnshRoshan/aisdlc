---
description: Read the evidence and approval logs back: runs, staleness, stale approvals, review state
---

Run `npx aisdlc-cli report` (every feature) or `npx aisdlc-cli report <feature>` (one, in detail). Present the numbers as they come out of the tool and add nothing that is not in them: recorded runs and pass rate, whether the last full run predates the last code change, how many approvals went stale because the artifact was edited after signing, how the review scored (independent, declared degraded, same family, unrecorded), open tasks, deltas raised vs. decided, and the slowest gate-to-gate gap.

If `report` exits non-zero it found stale evidence or a stale approval. Say that first, name the command that clears it (`npx aisdlc-cli evidence <feature> --label full -- <test command>`), and do not describe the feature as verified. This command measures; it never changes state.
