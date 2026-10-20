# Glossary

The shared vocabulary. Skills and artifacts use these words with exactly these meanings. Add a term only when it changes an action.

| Term | Meaning |
|---|---|
| **aisdlc** | This process kit: 20 Agent Skills plus a zero-dependency Node CLI. |
| **Feature** | One unit of work with its own folder under `docs/features/<slug>/` and one system boundary. |
| **Lane** | The process weight for a feature: `spike`, `quick`, `standard`, `regulated`. Lanes only ratchet up. |
| **Gate** | A transition that must be satisfied before the next stage. G1 plan approval, G2 artifact consistency, G3 merge safety, G4 acceptance proof, G5 release approval, G6 runtime guardrails. |
| **Spec** | `spec.md`: EARS requirements, scenarios, constraints, seams and value sources. The source of truth for behavior. |
| **Requirement** | A `WHEN ... THE SYSTEM SHALL ...` statement with at least one scenario. |
| **Scenario** | A GIVEN/WHEN/THEN case that a test can attach to. |
| **Delta** | A recorded change of intent after the spec is signed; it invalidates stale approvals on purpose. |
| **Plan** | `plan.md`: architecture, decisions, data model, contracts, seams, work breakdown and traceability. |
| **Task** | A tracer-bullet step in `tasks.md`, with a requirement ref, a seam and optional `after:` edges. |
| **Seam** | The public interface a test attaches to: a CLI command, exported function, route or UI flow. |
| **Evidence** | A recorded run: exact argv, exit code, timestamps and source fingerprints, written by `aisdlc evidence`. |
| **Approval** | A human signature bound to an artifact hash and appended to `approvals.json`. Agents never approve. |
| **Segregation of duties (SoD)** | The author, the reviewer and the approver are different identities. Self-approval fails. |
| **Hash binding** | An approval is valid only for the exact artifact content it signed. Editing the artifact makes it stale. |
| **Stale approval** | An approval whose recorded hash no longer matches the current artifact or tree. It is ignored, never reused. |
| **Tree binding** | The proposed extension that also records the git `head` and `tree` at signing time, so a post-approval commit is visible. |
| **Acceptance bar** | The human-owned line in the spec and acceptance file. `Approved-by` is never filled by an agent. |
| **Review** | A two-axis independent check: spec compliance first, standards second. The reviewer never approves. |
| **Rollout / runbook** | The release strategy and rollback, plus the operating symptoms and actions. |
| **Guardrail** | A runtime budget, alert or kill switch recorded in `guardrails.yaml`. |
| **Guard** | The Claude Code mod that blocks bare test runs, self-approval and edits to signed artifacts. |
| **Enforcement level** | What a harness actually enforces: native guard, CI-only, or none. `doctor` must report the truth. |
| **Report** | `aisdlc report`: reads evidence and approvals back, shows staleness and the review score. |
| **Retro** | The close-the-loop skill that turns a finished feature into edits to the constitution, taste, glossary or a skill. |
| **Handoff** | A session-compaction document so another agent continues without chat history. |
| **Constitution** | `docs/constitution.md`: the ten invariants every agent and human obeys. |
| **Taste** | `docs/taste.md`: how code is written here, not what it does. |
| **Tracer bullet** | A thin end-to-end slice through the real seam, not a layer. |
| **Attestation** | An in-toto Statement describing what was built and which gates passed, inside a DSSE envelope. |
| **SARIF** | The standard findings format for code scanning; proposed export target. |
| **MCP** | Model Context Protocol; proposed read-only state surface so any client can ask `next`/`status`. |
