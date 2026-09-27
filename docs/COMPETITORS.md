# COMPETITORS.md — what the other process kits actually do

Raw research notes, kept so the next gap analysis does not have to re-derive them.
Read alongside [`RESEARCH.md`](RESEARCH.md) §7 (v2), §8 (v3, the analysis that used this file) and §9 (v4, the final head-to-head).
**Status:** every "Things aisdlc does not have" list below is a snapshot from research time — §9 says which have since been closed and which were deliberately not copied.
All of it is read-only research on public repos/docs; nothing here is vendored.

Sources are cited inline. Checked: Sept 2026.

---

## 1. BMAD-METHOD (bmad-code-org/BMAD-METHOD, v6.11)

Four phases, each a set of workflows that emit documents the next phase consumes:

| phase | status | workflows | emits |
|---|---|---|---|
| 1 Analysis | optional | brainstorming (60 techniques), deep-recon, forge-idea, product-brief, PR-FAQ | `brainstorming-report.md`, `product-brief.md`, `forged-idea.md` |
| 2 Planning | required | `bmad-prd`, `bmad-ux`, `bmad-spec` | `PRD.md`, `DESIGN.md` + `EXPERIENCE.md`, `SPEC.md` |
| 3 Solutioning | required | `bmad-architecture`, `bmad-sprint-planning` | `architecture.md` + ADRs, `sprint-status.yaml` |
| 4 Implementation | required | `bmad-build`, `bmad-code-review`, `bmad-build-auto`, `bmad-retrospective` | story spec, code, review verdict, retro |

Things aisdlc does not have:

- **`forge-idea`** — pressure-tests an idea through persona-driven interrogation *until it hardens, proves out, or dies cheaply*. Produces `forge-report.html`; on success `forged-idea.md`. Discovery in aisdlc always terminates in a brief; there is no explicit "do not build" verdict.
- **Readiness gate with three verdicts** — `bmad-sprint-planning` judges a plan buildable as `PASS` / `CONCERNS` / `FAIL`. aisdlc G1 is approve/reject; the concept of "approved with concerns, listed here" is undocumented.
- **`bmad-build` four-step loop** — clarify-and-route → plan (deep codebase investigation + *Matrix Test Audit* defining I/O and edge-case expectations) → implement (captures `baseline_commit` first) → review. The `baseline_commit` idea (record where the tree was before you touched it) has no aisdlc equivalent.
- **Review lenses and triage** — `bmad-review` runs Adversarial / Edge-Case / Verification-Gap lenses; findings are triaged into `patch` / `decision_needed` / `defer`. aisdlc has blocking/advisory only.
- **`.decision-log` pattern** — a running log of decisions threaded through every workflow so later phases know what was decided and why.
- **`correct-course`** — a named workflow for significant mid-sprint change: updated plan or re-route. aisdlc has `aisdlc-delta` for spec change but no named path for "the plan is wrong, spec is fine" or "I am blocked".
- **PR-FAQ (Amazon Working Backwards)** — 4-stage coached workflow with a "weasel-word challenge".
- **`bmad-ux` two-spine contract** — `DESIGN.md` (visual identity, tokens) + `EXPERIENCE.md` (behavior, flow, IA, states, a11y), with `EXPERIENCE.md` referencing `{path.to.token}` from DESIGN.md, named-protagonist journeys, surface-closure validation.
- **`bmad-spec` five-field kernel** — Problem, Capabilities, Constraints, Non-goals, Success signal; "Spec Law" (lean prose), `sources:` list of absorbed inputs that downstream skills skip, headless JSON output.
- **Skill activation guardrails** — LLMs were short-circuiting activation sequences (INCLUDE → READ → RUN → CHECK) by guessing variables instead of executing in order; guardrails now name append steps and require confirmation. Lesson for aisdlc: **state the order of operations explicitly, and forbid skipping**.
- **`project-context.md` / AGENTS.md block** — a verified block written into `AGENTS.md` carrying required policies and pitfalls. aisdlc `init` already writes the constitution into the agent's instructions file.
- **Retro machine-readable verdict** — `accepted` / `accepted-with-open-items` / `rejected`, forced to `rejected` if any `pending_stories` remain; action items appended to `sprint-status.yaml`.
- **Modules beyond the method**: Builder (skill/workflow builder), Creative Intelligence Suite, **Test Architect** (enterprise testing add-on), Loop (unattended build-verify-retro per epic), Game Dev Studio.

## 2. GitHub Spec Kit (github/spec-kit)

Command chain: `constitution → specify → clarify → plan → checklist → tasks → analyze → implement → converge`.

Things aisdlc does not have:

- **Constitution as a governed artifact.** `.specify/memory/constitution.md` carries `RATIFICATION_DATE`, `LAST_AMENDED_DATE`, `CONSTITUTION_VERSION` with semver bump rules (MAJOR = principle removed/redefined, MINOR = principle added, PATCH = wording), plus a **Sync Impact Report** prepended as an HTML comment listing every dependent template touched. aisdlc's `docs/constitution.md` has no version or amendment procedure; `aisdlc-retro` proposes edits to it with no rule about how.
- **Constitution Check inside the plan.** `speckit.plan` fills a Constitution Check section from the constitution and evaluates gates: **ERROR if violations are unjustified**. `aisdlc-plan`'s Inputs section does not even list `docs/constitution.md`.
- **`/speckit.analyze`** — a *read-only* cross-artifact consistency and quality analysis across spec/plan/tasks: conflicts, gaps, ambiguities (task with no requirement, plan choice contradicting spec). It never edits; it reports and suggests, then you fix at the source that owns the problem and re-run. aisdlc G2 is mechanical (trace + EARS + signature), never analytical.
- **`/speckit.converge`** — post-implementation completeness audit that is **append-only**: its only possible write is new tasks in `tasks.md`. Run until it reports converged.
- **Plan Phases 0/1 artifacts** — `research.md` (per unknown: Decision / Rationale / Alternatives considered), `data-model.md` (entities, fields, relationships, validation rules, state transitions), `contracts/` (route/CLI/grammar/UI contract formats), `quickstart.md` (runnable validation scenarios with prerequisites, commands, expected outcomes).
- **`/speckit.checklist`** — generates custom quality checklists for requirements, described as "unit tests for English". Maintained by specify/clarify for requirements; custom checklists are reviewer-owned and block implement while unchecked.
- **Task phases** — Setup → Foundational (blocking prerequisites) → one phase per user story → Polish, with explicit **parallel execution markers**.
- **Clarify budget** — up to five targeted questions per run, re-runnable, each run tackling a different area.
- **Extensions / presets / project-local overrides** — a four-layer template resolution stack (overrides → presets → extensions → core) resolved at runtime.

## 3. obra/superpowers

Composable skill workflow: brainstorming → using-git-worktrees → writing-plans → (subagent-driven-development | executing-plans) → TDD → requesting-code-review → finishing-a-development-branch.

Things aisdlc does not have:

- **`using-git-worktrees`** — after design approval, create an isolated workspace on a new branch, run project setup, and **verify a clean test baseline before any work starts**. aisdlc assumes the suite is green; nothing says to prove it first.
- **`writing-plans` quality bar** — "assuming the engineer has zero context for our codebase and questionable taste"; every task carries exact file paths, complete code, testing, docs to check. Task granularity: **2–5 minutes per step**, each step one action. Then a **plan review loop**: dispatch a single `plan-document-reviewer` subagent with crafted context (path to plan, path to spec) — never your session history — and re-dispatch until approved.
- **`subagent-driven-development`** — fresh subagent per task; you *construct* exactly the context it needs and it never inherits your session history; **two-stage review after each task: spec compliance first, then code quality**; explicit "never start quality review before spec compliance passes"; model selection (cheap/fast for mechanical, strong for multi-file judgment); prompt templates for implementer / spec-reviewer / code-quality-reviewer.
- **`executing-plans`** — the parallel-session alternative: batch execution with **human checkpoints every 3 tasks**.
- **`dispatching-parallel-agents`** — concurrent subagent workflows.
- **`finishing-a-development-branch`** — verify tests → present exactly four options (merge locally / push and open PR / keep branch / discard) → execute the chosen one → clean up the worktree. aisdlc has no exit decision for the branch at all.
- **`requesting-code-review`** — hands the reviewer base/head SHAs, what was implemented, plan/requirements; classifies issues Critical / Important / Minor; critical blocks progress; "push back if the reviewer is wrong, with reasoning".
- **`receiving-code-review`** — how to respond to feedback on your own work. aisdlc `aisdlc-review` produces findings but nothing tells the author-agent how to handle a human's pushback or requested changes.
- **`writing-skills` + `testing-skills-with-subagents`** — meta skills for authoring and validating skills.

## 4. OpenSpec (Fission-AI/OpenSpec)

`openspec/specs/` is what is true; `openspec/changes/<name>/` is what is proposed; archiving folds one into the other.

Artifacts per change: `proposal.md` (why) → `specs/<capability>/spec.md` (delta) → `design.md` (how) → `tasks.md` (steps) → apply.

Things aisdlc does not have:

- **Structured delta operations** — `## ADDED Requirements`, `## MODIFIED Requirements` (must include the *full* updated content, not a partial rewrite), `## REMOVED Requirements` (must include **Reason** *and* **Migration**), `## RENAMED Requirements` (FROM:/TO:). `openspec validate` rejects a zero-delta change unless `skip_specs: true`. aisdlc's delta table has `modify / add / remove` and no rename, no mandatory reason/migration.
- **Validation command** — `openspec validate [--strict]` catches formatting errors that would otherwise fail silently (scenarios must use exactly `####`).
- **PR carries the spec delta** — the review order is proposal → delta → code diff, so a reviewer can disagree with the approach cheaply instead of relitigating it in a diff.
- **Archive step** — completed changes move to `changes/archive/YYYY-MM-DD-<name>/`, preserving everything for audit; specs merge at archive (or earlier via sync).
- **Conflict detection across parallel changes** — two changes touching the same requirement conflict at archive time in `openspec/specs/`.
- **Dependency-graph artifact creation** — `continue` queries which artifact is ready vs blocked; `ff` fast-forwards all of them.
- **`explore`** — a no-stakes thinking partner before any artifact exists ("the best antidote to an AI that will otherwise build *something* from a vague prompt"). aisdlc's equivalent is brainstorm, which is heavier (it classifies a lane).

## 5. Agent OS (buildermethods/agent-os)

Three-layer context: **Standards** (how you build), **Product** (mission/roadmap/tech-stack), **Specs** (what to build next).

Phases: `plan-product` → `shape-spec` → `write-spec` → `create-tasks` → (`implement-tasks` | `orchestrate-tasks`).

Things aisdlc does not have:

- **`research.md` + `data-model.md` + `contracts/` + `quickstart.md` as spec-folder artifacts** (same set as Spec Kit), plus `spec-lite.md` — a condensed spec summary for cheap context loading.
- **`standards/` as injectable units** — `tech-stack.md`, `code-style.md`, `best-practices.md`, `git-conventions.md`, `testing.md`, per-language style guides, with an `index.yml` that lets `/inject-standards` surface only the relevant ones for what you are building. aisdlc has one `docs/taste.md`, which is deliberately small; the *selective injection* idea (only load the standards that apply to this task's kind) is not implemented.
- **`orchestrate-tasks`** — delegate task groups to specialised subagents with per-group standards, or generate targeted prompt files when the harness has no subagents.
- **Named helper subagents** — `context-fetcher`, `test-runner`, `git-workflow`, `file-creator`, so the main agent does not burn context on mechanical work.
- **Pre/post-execution phases** around task execution (pre-flight, execution loop, post-execution) rather than a bare loop.

## 6. AWS Kiro

Specs produce exactly three files: `requirements.md` (EARS + user stories with acceptance criteria), `design.md`, `tasks.md`.

Things aisdlc does not have:

- **User stories with acceptance criteria above the EARS lines** — `US-1: As a … I want … so that …` then the EARS criteria underneath. aisdlc requirements are pure EARS with no user-story framing; the *job story* lives in `docs/brief.md` and is not carried into the spec.
- **Design-first workflow variant** — Requirements-First, Design-First, and Quick Spec (all three without approval gates). aisdlc has only requirements-first (plus spike).
- **`Analyze Requirements`** — a named step that checks the draft for *logical inconsistencies, ambiguities, conflicting constraints, and gaps* before design (e.g. "requirement 2 and 4 conflict on what happens when a file both fails checks"). This is the same job as Spec Kit's `analyze`, aimed at the spec alone.
- **Dependency waves** — `Run all Tasks` builds a dependency graph and groups independent tasks into waves that execute concurrently. aisdlc's `tasks.md` already has `after:` edges, which is exactly the data needed, but no skill says to derive waves from them.
- **Traceability in the design** — `Req 1, 3 -> EventBridge rule + Lambda handler`, so a reviewer can answer "why does this code exist". aisdlc has requirement→task traceability, not requirement→design-component.
- **Steering files with inclusion modes** — `always` / `fileMatch` / `manual` / `auto`, plus `#[[file:path]]` references. aisdlc always loads taste + glossary.
- **Hooks** — event-driven automation (`fileEdited`, `preToolUse`, `postTaskExecution`…) that runs deterministic checks on save, committed to the repo. aisdlc's equivalent is the CLI gate; there is no hook guidance.

## 7. Anthropic's own skill-authoring guidance (platform docs + skill-creator)

Applies directly to the shape of every `SKILL.md` here:

- Frontmatter `description` ≤ **1024 chars**, third person, must contain **what it does and when to use it** (all trigger phrases live in the description — a "When to use" section in the body is useless because the body is not loaded until after triggering). *aisdlc: all 20 descriptions are 322–738 chars — compliant.*
- **SKILL.md body under 500 lines**; split into `references/` when approaching it. *aisdlc: largest is ~130 lines / 9.2 KB — compliant, so no split is warranted; see RESEARCH §8 for why we deliberately did not add `references/`.*
- Structure: frontmatter → brief statement of what/why → **step-by-step procedure** → **`## Examples`** → best practices/notes.
- `references/` are one level deep from SKILL.md, linked with a clear "read this when" trigger, and files >100 lines get a table of contents.
- `scripts/` for deterministic operations: run them, do not read them; only output enters context.
- Progressive disclosure is the whole point: metadata (~100 tokens) always in context, body on trigger (<5k tokens), resources only when accessed.
- Optimise by watching where agents go wrong, then adding the context they actually needed — not by anticipating everything up front.

## 8. AGENTS.md / CLAUDE.md instruction-file research (HumanLayer, Chatcode, community guides)

Relevant to how much the skills ask a session to load every turn:

- Instruction files are *context, not enforced configuration*; safety belongs in hooks/CI, taste belongs in the file.
- Keep root instruction files short (Anthropic: <200 lines); a fact belongs there only if it applies to most work, is not quickly discoverable, and changes an observable action.
- Prefer **pointers over copies** so nothing rots.
- "Never send an LLM to do a linter's job" — deterministic tools for mechanical rules. *aisdlc already follows this: `aisdlc-quality` is tool-first, and the CLI is law.*
- Add an instruction when the agent repeats a mistake; delete it when it stops earning its place. *aisdlc's `aisdlc-retro` applies this to constitution/taste/glossary but not systematically to the skills themselves.*
