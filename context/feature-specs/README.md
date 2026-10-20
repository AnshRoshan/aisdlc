# Feature Specs Index

Per-change artifacts are canonical in `docs/features/<slug>/`, because the aisdlc CLI reads that path (`aisdlc.json` -> `featuresDir`). This folder indexes them; it never holds a second copy. Two copies of the same spec is the failure mode this system exists to prevent.

| Feature | Lane | State | Source |
|---|---|---|---|
| Market readiness | standard | Proposed; G1 unsigned | [spec](../../docs/features/market-readiness/spec.md) |

## Status vocabulary

- **Proposed**: spec written, no human approval, no evidence.
- **In progress**: G1 signed; at least one task open.
- **Accepted**: G4 signed; evidence recorded.
- **Released**: G5 signed; rollout complete.
- **Killed**: a discovery verdict said do not build, or a delta removed the scope.

## Rules

- One feature folder per system boundary. If a folder grows past five tasks or crosses a boundary, split it and leave a pointer in `context/build-plan.md`.
- Decisions made while building go to `context/decisions.md`, not into the feature folder.
- A skipped gate is recorded as skipped, never as passed.
