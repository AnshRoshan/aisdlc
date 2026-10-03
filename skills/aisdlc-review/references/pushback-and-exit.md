# Pushback, and what happens after G4 is green

Read this only when one of two things has happened: the human disagrees with a finding, or G4 has
passed and the work has to leave the branch. Not before.

## When the human pushes back

The human is allowed to disagree with you. You are not allowed to sulk, comply silently, or win by volume.

- **Answer every finding individually**: `fixed` (with the new evidence file), `accepted-as-is` (with the reason), or `disputed` (with the artifact that proves your case — the scenario, the evidence file, the spec line). One line each; no essays.
- **A requested behaviour change is a delta.** If resolving the pushback changes what a requirement says, stop arguing in review and load `aisdlc-delta`. Approvals go stale on purpose; say so.
- **A fix re-opens evidence.** Any code change after a green run means the previous evidence is stale: re-run the affected evidence and the full suite before claiming the finding is closed. `git log -1` vs `startedAt` is how the next reviewer catches you.
- **Push back with artifacts, never with authority.** "I disagree because scenario S3 says X and the evidence file Y shows X" is a response. "I think it's fine" is not — delete it and go read the scenario.
- **You may not overwrite a human's verdict.** If they accept a blocking finding, it moves to `advisory` with `accepted-as-is · <who>` and the acceptance table keeps the row honest. The signature is theirs.

## Exit decision (after G4 is green)

Accepted work still has to leave the branch. Present exactly these four options and wait for the choice:

1. **Merge** into the base branch locally — run the full suite after the merge, record it, delete the branch/worktree.
2. **Open a PR** — push, then open it with this body order (a reviewer reads in this order, and it stops them relitigating the approach inside a 300-line diff):
   - the spec summary: what problem, what changed, lane and gates passed
   - the acceptance table (rows, results, evidence file names)
   - findings and their triage
   - then the diff link
   Include the feature folder path so the reviewer can read `spec.md` before the code.
3. **Keep the branch** — nothing merged, worktree intact, state on disk unchanged.
4. **Discard** — requires the literal word "discard"; delete branch and worktree only after confirming the evidence is committed or the user accepts losing it.

Verify tests before offering any option. Never describe a PR as "checks passing" — you did not run CI; say what you *did* record.
