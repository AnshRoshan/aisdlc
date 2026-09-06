import { KIND_HINTS, LANE_HINTS } from "./engine.js";

export const MARK_START = "<!-- aisdlc:start -->";
export const MARK_END = "<!-- aisdlc:end -->";

export const INSTRUCTIONS_BLOCK = (skillNames) => `${MARK_START}
# aisdlc: agents write code, aisdlc runs the process

This repository uses the aisdlc process. Before starting any engineering task:

1. Run \`npx aisdlc next <feature>\` (or \`npx aisdlc status\`) and trust its output over chat history. If the CLI is unavailable, \`aisdlc-flow\` explains how to derive the state from the files by hand.
2. Load the skill it names (\`${skillNames.join("`, `")}\`). Start with \`aisdlc-flow\` when unsure, \`aisdlc-brainstorm\` for a new idea, \`aisdlc-debug\` for a bug.
2b. Match process to stakes with lanes: spike (answer a question) · quick (bounded change, G2-G4) · standard (all gates) · regulated (two approvers). Lanes only ratchet up.
3. Obey the eight invariants:
   spec is truth · gates are transitions · approver ≠ author · humans sign the acceptance bar ·
   done = recorded evidence · disk is state · no secrets in files · fail loud, never fake green.
4. Never write a name into an \`Approved-by:\` line and never run \`aisdlc approve\`. Those are human actions.
5. Record every test run with \`npx aisdlc evidence <feature> -- <command>\`. A claim without an evidence file is not a claim.
6. Any change of intent after the spec is signed goes through \`aisdlc-delta\`.
7. Write the least code that passes the spec (\`aisdlc-ponytail\`; uses the official \`ponytail\` skill if installed). Ask decisions with recommended answers, find facts yourself (\`aisdlc-grill\`; uses the official \`grilling\` skill if installed).
8. Before a session ends mid-feature, write \`handoff.md\` (\`aisdlc-handoff\`). After DONE, run \`aisdlc-retro\`.

Artifacts live in \`docs/features/<slug>/\`; project taste lives in \`docs/taste.md\`; shared vocabulary in \`docs/glossary.md\`; the constitution in \`docs/constitution.md\`.
${MARK_END}`;

export const CONSTITUTION = (project) => `# ${project}: Constitution

Non-negotiables every agent and human in this project obeys. Add project-specific rules below the line.

1. The spec is the source of truth. Code is generated output; intent changes go through deltas.
2. Gates are transitions, not suggestions. No evidence, no progress.
3. Segregation of duties: the approver is never the author or the prompter.
4. Humans own the acceptance bar (Approved-by lines are human-signed).
5. Stranger-trust: done = run artifact recorded as evidence.
6. Disk is state. Chat is not. \`aisdlc next\` derives the truth from files.
7. Secrets never land in files. Placeholders only. Fail closed.
8. Fail loud, never fake green. Infra-down means IMPLEMENTED-NOT-VERIFIED, not PASS.

9. Process matches stakes. Lanes (spike, quick, standard, regulated) decide which gates apply; they only ratchet up.
10. The least code that passes the spec wins. No new dependency without a plan decision that says why the platform did not suffice.

---

## Project rules
- (add yours)
`;

export const FEATURE_JSON = (title, slug, kind, author, lane = "standard") =>
  JSON.stringify({ title, slug, kind, lane, author, created: new Date().toISOString(), aisdlc: 2 }, null, 2) + "\n";

export const SPEC = (title, kind, lane = "standard") => `# Spec: ${title}

## 1. Context
Kind: **${kind}**. Lane: **${lane}** (${LANE_HINTS[lane] || LANE_HINTS.standard}). Verify model: ${KIND_HINTS[kind] || KIND_HINTS.other}.
Problem: [NEEDS CLARIFICATION: one sentence from the brief]. Users: [NEEDS CLARIFICATION: roles].

## 2. Goals / Non-goals
- Goal: ${title}
- Non-goal: [NEEDS CLARIFICATION: what is explicitly out of scope?]

## 3. Requirements (EARS)
### Requirement: Primary Flow
WHEN [NEEDS CLARIFICATION: trigger] THE SYSTEM SHALL [NEEDS CLARIFICATION: response].

#### Scenario: Happy path
- GIVEN a valid precondition
- WHEN the trigger happens
- THEN the observable result is visible

## 4. Constraints (non-functional, EARS)
- THE SYSTEM SHALL keep secrets out of artifacts; evidence for every claim.
- auth: [NEEDS CLARIFICATION: who must not be able to do this?]
- data: [NEEDS CLARIFICATION: what is stored, for how long, is any of it PII?]
- budget: [NEEDS CLARIFICATION: a number for latency, size or volume, or n/a with a reason]

## 5. Acceptance bar
Approved-by: ______  Date: ______

## 6. Open questions
| # | Question | Owner | Status |
|---|---|---|---|
| 1 | Anything unresolved from discovery? | you | open |

## 7. Seams (where tests attach)
- [NEEDS CLARIFICATION: the public interface the tests will use: route / CLI / exported function / UI flow]
`;

export const PLAN = (title) => `# Plan: ${title}

## Architecture
<components and one dependency diagram>

## Decisions
| # | Decision | Alternatives considered | Why |
|---|---|---|---|

## Work breakdown
- T1 [R:Primary Flow] Implement the primary flow behind a failing test

## Traceability
| Requirement | Tasks |
|---|---|
| Primary Flow | T1 |

## Verification strategy
<kind-specific>

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep without a delta | medium | high | aisdlc-delta |

## Rollback thinking
<what is reversible>
`;

export const TASKS = (title) => `# Tasks: ${title}

- [ ] T1 [R:Primary Flow] Implement the primary flow behind a failing test
`;

export const ACCEPTANCE = (title) => `# Acceptance: ${title}

| ID | Requirement | Scenario | Evidence | Result |
|---|---|---|---|---|
| A1 | Primary Flow | Happy path | <evidence file> | pending |

## Findings
- (none yet)

Approved-by: ______  Date: ______
`;

export const ROLLOUT = (title) => `# Rollout: ${title}

## Strategy
Flag <FLAG_NAME> · canary 5% → 25% → 100% · bake 30 min per step.

## Preconditions
- G4 green

## Rollback
1. Flip <FLAG_NAME> off.
2. Revert the release tag.
3. Run the smoke suite.
Owner: on-call. Max time to rollback: 10 minutes.

## Comms
Changelog · status page

Approved-by: ______  Date: ______
`;

export const GUARDRAILS = `budgets:
  latency_p95_ms: 800
  error_rate_pct: 1.0
  monthly_cost: 5000
kill_switch: <FLAG_NAME>
alerts:
  - on: error_rate_pct > budget for 5m
    do: page owner, flip kill_switch
review_after_days: 14
`;

export const RUNBOOK = (title) => `# Runbook: ${title}

## Symptoms → Actions
| Symptom | First action | Escalate to |
|---|---|---|
| Error budget burning | flip kill switch | owner |

## Dashboards / logs
- ...

## Contacts
On-call rotation: ...
`;

export const TASTE = `# Taste profile

## Code
style: minimal & explicit      naming: descriptive, no abbreviations      comments: why, not what      errors: fail loud

## Tests
philosophy: test-first for behaviour, characterization for legacy   runner: <runner>   green means: unit + integration

## Agent behaviour
verbosity: short rationale per change   laziness: full   interview: rounds   ask before: deleting files, changing schemas   never: fill Approved-by

## Review
blocks on: correctness, security, spec violation, untraced change   advisory: style

## Definition of done
- [ ] failing test first, then green, evidence recorded
- [ ] task checked in tasks.md
- [ ] secrets scan clean

## UI (if applicable)
references: ...   density: ...   motion: ...   palette: ...   type: ...   a11y: WCAG AA
anti-patterns: generic gradients, unlabeled icons, placeholder copy
`;

export const CLAUDE_COMMAND = (skill, desc) => `---
description: ${desc}
---
Load and follow the \`${skill}\` skill in this repository (.claude/skills/${skill}/SKILL.md). Start by running \`npx aisdlc next $ARGUMENTS\` and obey its output.
`;

export const GEMINI_COMMAND = (skill, desc) => `description = "${desc.replace(/"/g, '\\"')}"
prompt = """
Load and follow the ${skill} skill in this repository (.gemini/skills/${skill}/SKILL.md). Start by running \`npx aisdlc next {{args}}\` and obey its output.
"""
`;

export const COPILOT_PROMPT = (skill, desc) => `---
description: ${desc}
---
Load and follow the \`${skill}\` skill in this repository (.github/skills/${skill}/SKILL.md). Start by running \`npx aisdlc next\` and obey its output.
`;
