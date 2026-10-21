---
description: Read the evidence and approval logs back: runs, staleness, stale approvals, review state
---

Run `npx arsdlc report` (every feature) or `npx arsdlc report <feature>` (one, in detail). Present the numbers as they come out of the tool and add nothing that is not in them: recorded runs and pass rate, whether the last full run predates the last code change, how many approvals went stale because the artifact was edited after signing, how the review scored (independent, declared degraded, same family, unrecorded), open tasks, deltas raised vs. decided, and the slowest gate-to-gate gap.

Exit 3 reports stale evidence or approvals: identify which. Stale evidence needs a fresh `npx arsdlc evidence <feature> --label full -- <test command>`; a stale approval needs human review and re-approval of that gate. Other non-zero exits are command failures, not staleness findings. Do not call the feature verified. This command measures; it never changes state.
