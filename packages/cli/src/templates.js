import { KIND_HINTS, LANE_HINTS } from "./engine.js";

export const MARK_START = "<!-- aisdlc:start -->";
export const MARK_END = "<!-- aisdlc:end -->";

export const INSTRUCTIONS_BLOCK = (skillNames) => `${MARK_START}
# aisdlc: agents write code, aisdlc runs the process

This repository uses the aisdlc process. Before starting any engineering task:

1. Run \`npx aisdlc-cli next <feature>\` (or \`npx aisdlc-cli status\`) and trust its output over chat history. If the CLI is unavailable, \`aisdlc-flow\` explains how to derive the state from the files by hand.
1b. Before writing any code, read \`docs/taste.md\`, \`docs/glossary.md\` and \`docs/constitution.md\`. They are always-on steering: how to build here, what the words mean, what is non-negotiable. They are short by design - read them in full.
2. Load the skill it names (\`${skillNames.join("`, `")}\`). Start with \`aisdlc-flow\` when unsure, \`aisdlc-brainstorm\` for a new idea, \`aisdlc-debug\` for a bug.
2b. Match process to stakes with lanes: spike (answer a question) · quick (bounded change, G2-G4) · standard (all gates) · regulated (two approvers). Lanes only ratchet up.
3. Obey the eight invariants:
   spec is truth · gates are transitions · approver ≠ author · humans sign the acceptance bar ·
   done = recorded evidence · disk is state · no secrets in files · fail loud, never fake green.
4. Never write a name into an \`Approved-by:\` line and never run \`aisdlc approve\`. Those are human actions.
5. Record every test run with \`npx aisdlc-cli evidence <feature> -- <command>\`. A claim without an evidence file is not a claim.
6. Any change of intent after the spec is signed goes through \`aisdlc-delta\`.
7. Write the least code that passes the spec (\`aisdlc-ponytail\`; uses the official \`ponytail\` skill if installed). Ask decisions with recommended answers, find facts yourself (\`aisdlc-grill\`; uses the official \`grilling\` skill if installed).
8. Before a session ends mid-feature, write \`handoff.md\` (\`aisdlc-handoff\`). After DONE, run \`aisdlc-retro\`.

Artifacts live in \`docs/features/<slug>/\`; project taste lives in \`docs/taste.md\`; shared vocabulary in \`docs/glossary.md\`; the constitution in \`docs/constitution.md\`.
${MARK_END}`;

export const CONSTITUTION = (project) => `# ${project}: Constitution

Version: 1.0
Amended: ${new Date().toISOString().slice(0, 10)}

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

export const SPEC = (title, kind, lane = "standard") => {
  const ui = kind === "frontend" || kind === "mobile";
  return `# Spec: ${title}

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

## 8. UX & interaction${ui ? " (kinds frontend / mobile)" : ` (n/a: ${kind})`}
${ui ? `- Primary journey: [NEEDS CLARIFICATION: the first thing a user does, step by step]
- States: loading [NEEDS CLARIFICATION: copy] · empty [NEEDS CLARIFICATION: copy] · error [NEEDS CLARIFICATION: copy]
- A11y: [NEEDS CLARIFICATION: the bar - keyboard reachable, focus visible, screen-reader labels, WCAG level]` : `- n/a: ${kind} is not a UI kind.`}
`;
};

export const PLAN = (title) => `# Plan: ${title}

## Architecture
<3 to 10 sentences. Name components with glossary terms. One ASCII diagram of dependencies (A -> B).
For backend / data / infra / ml kinds also draw the sequence or data flow: who calls what, in order,
and where the data lands.>

## Constitution check
| Principle (from docs/constitution.md) | Verdict | Evidence / justification |
|---|---|---|
| The spec is the source of truth | comply | no spec edits in this plan |

## Decisions
| # | Decision | Alternatives considered | Why | Ladder rung |
|---|---|---|---|---|

## Research & unknowns
| # | Unknown | Decision | Rationale | Alternatives considered |
|---|---|---|---|---|

## Data model
<n/a: no new or changed data | entities, key fields, relationships, state transitions, retention>

## Interface contracts
<n/a: internal only | every route, command, exported function, event, file format and UI affordance
this feature exposes, with the shape of each>

## Seams (tests attach here; brownfield: toggles too)
- <seam>: <interface> · existing/new · toggled by <flag> (brownfield)

## Threat model (regulated lane; optional otherwise)
| Asset | Threat | Mitigation | Requirement |
|---|---|---|---|

## Work breakdown (tracer bullets)
- T1 [R:Primary Flow] <thin end-to-end slice through the seam, behind a failing test>

## Traceability
| Requirement | Tasks |
|---|---|
| Primary Flow | T1 |

## Verification strategy
Kind-specific: <from KIND hints: e.g. component tests + visual diff + a11y audit>. Full-suite command: \`<cmd>\`.

## Smoke path
<the shortest end-to-end proof a stranger can run: exact commands, in order, and what they should
observe. This is what a reviewer runs before reading the diff.>

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep without a delta | medium | high | aisdlc-delta |

## Rollback thinking
<what is reversible, what is not; migrations are expand/contract; flags default off>
`;

export const TASKS = (title) => `# Tasks: ${title}

- [ ] T1 [R:Primary Flow] Implement the primary flow behind a failing test
`;

export const ACCEPTANCE = (title) => `# Acceptance: ${title}

| ID | Requirement | Scenario | Evidence | Result |
|---|---|---|---|---|
| A1 | Primary Flow | Happy path | <evidence file> | pending |

## Findings
- F1 (<blocking|advisory> · <spec|safety|standards|over-built>): <finding> · triage: <fix now | defer → task/issue | decision needed → <who>>

## Reviewer notes
Reviewed by: <agent/model, session id> · axes run separately: yes/no · diff base: <sha>

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

export const GUARDRAILS = `# Every number below must come from a measured baseline or a stated SLO - never from this template.
budgets:
  latency_p95_ms: 800
  error_rate_pct: 1.0
  monthly_cost: 5000
kill_switch: <FLAG_NAME>   # must exist in the deployed config; name who can flip it
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
Load and follow the \`${skill}\` skill in this repository (.claude/skills/${skill}/SKILL.md). Start by running \`npx aisdlc-cli next $ARGUMENTS\` and obey its output.
`;

export const GEMINI_COMMAND = (skill, desc) => `description = "${desc.replace(/"/g, '\\"')}"
prompt = """
Load and follow the ${skill} skill in this repository (.gemini/skills/${skill}/SKILL.md). Start by running \`npx aisdlc-cli next {{args}}\` and obey its output.
"""
`;

export const COPILOT_PROMPT = (skill, desc) => `---
description: ${desc}
---
Load and follow the \`${skill}\` skill in this repository (.github/skills/${skill}/SKILL.md). Start by running \`npx aisdlc-cli next\` and obey its output.
`;
