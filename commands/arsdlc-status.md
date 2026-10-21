---
description: Show every arsdlc feature, its lane and its state
---

Run `npx arsdlc status`. For blockers, run `npx arsdlc next <slug> --json` per feature; `status` does not include them. Present a compact table: feature, lane, state, blockers. For human-owned actions, name the approval command or the exact unsigned section to sign. If no features exist, say so and suggest `npx arsdlc new "<name>" --kind <kind>` or loading the arsdlc-brainstorm skill.
