---
description: Show every aisdlc feature, its lane and its state
---

Run `npx aisdlc status`. Present the result as a compact table: feature, lane, state, blocking items. For each feature that is blocked on a human action (approval, signature, decision), name the exact command the human must run. If no features exist, say so and suggest `npx aisdlc new "<name>" --kind <kind>` or loading the aisdlc-brainstorm skill.
