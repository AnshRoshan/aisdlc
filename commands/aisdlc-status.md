---
description: Show every aisdlc feature, its lane and its state
---

Run `npx aisdlc-cli status`. For blockers, run `npx aisdlc-cli next <slug> --json` per feature; `status` does not include them. Present a compact table: feature, lane, state, blockers. For human-owned actions, name the approval command or the exact unsigned section to sign. If no features exist, say so and suggest `npx aisdlc-cli new "<name>" --kind <kind>` or loading the aisdlc-brainstorm skill.
