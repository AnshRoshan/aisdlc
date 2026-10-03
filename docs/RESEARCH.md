# aisdlc Platform — Analysis, research & product decisions

This is the written answer to "analyze the PRD, research the right approach, tell me what's good and what's bad, then build it". Everything below was applied in this repository.

## 1. Verdict on the PRD (v1.1 rebuild blueprint)

**What is excellent (keep):**
- The *invariants* (§3) are the product. Disk/DB-derived state, evidence gates, SoD, human-owned acceptance bar, fail-loud. Nobody else in the "spec-driven AI dev" space enforces these; Spec Kit/BMAD only *advise*.
- The bug ledger (§6) is gold — every trap was found by executing. The TypeScript engine here ports the L3/L4/L5/L6 fixes exactly (slice from `m.end()`, lookahead terminator for `Approved-by`, normalise-then-locate for deltas).
- The kinds system makes the tool universal (fe/be/data/infra/docs/ML) — the wizard captures kind on question 4.
- The backlog items #1 (typed evidence w/ artifact hash) and #2 (hash-chained approvals) are cheap and hugely valuable; both are implemented here, not deferred.

**What was missing / weak (fixed here):**
1. **No front door.** The PRD starts at "spec". Real users start at "I have a vague idea" or "I have a scary repo". → The **Double-Diamond discovery intake** (Orient → Discover → Define → Develop → Deliver → Taste) is now the first screen. It uses JTBD job stories, 5 Whys, problem-statement framing, How-Might-We, MoSCoW must-haves (→ seed EARS requirements), riskiest-assumption, and a brownfield branch (repo, stack, pain points, "must never change" → golden-master seams).
2. **Taste was implied, never captured.** → The intake writes a **taste profile** (code style, testing philosophy, agent verbosity, review strictness, languages, DoD) stored per project and editable; agents load it with every skill.
3. **SoD via git identity is spoofable** (PRD admits it). → Real accounts + roles; approvals bind to the *artifact hash* (editing the plan invalidates stale signatures) and chain via `prev_hash`.
4. **No commercial layer.** → Plans/limits, Razorpay (INR-first), sandbox mode, admin console, audit export.
5. **"Docker and everything" anxiety.** → `DEPLOY.md` walks from laptop → ₹800/mo VPS → PaaS → K8s, with Razorpay go-live and backups.

## 2. Local vs cloud vs self-host — decision
| Option | Pros | Cons |
|---|---|---|
| Local-only (CLI) | zero trust needed, offline | every user installs agents/browsers/python; no team visibility; no revenue |
| Cloud only | zero setup, easiest to sell | dev-tool buyers (esp. enterprises, Indian IT services) distrust sending specs/code out |
| **Open-core: cloud + one-command self-host (chosen)** | adoption wedge (free self-host) + revenue (cloud convenience, team features) + enterprise path | must keep both shapes on one codebase |

The same Docker image serves all three shapes. The CLI stays the offline floor (`sync` bridge; API parity with `flow next`).

## 3. Pricing research → catalogue
- Dev-tool norms 2025-26: per-seat or per-workspace tiers; free tier that is genuinely useful; annual = 2 months free.
- India: card penetration is low, UPI dominant → **Razorpay** (UPI, cards, net-banking, EMI; 2% + 18% GST on the fee). Stripe India is invite-heavy; PayPal poor for INR.
- Catalogue: Free ₹0 (1 project/3 features) · Pro ₹799/mo (5/50) · Team ₹2,499/mo (25/500, policy engine, audit export) · Enterprise/self-hosted custom. Editable in Admin → Plans (no redeploy).
- Sandbox mode lets you demo and test limits before Razorpay KYC completes.

## 4. Discovery technique map (why each question exists)
| Technique | Source | Used in |
|---|---|---|
| Double Diamond (Discover/Define/Develop/Deliver) | Design Council 2004/2019 | wizard phases |
| Jobs-to-be-Done job story | Christensen / Klement | `jtbd` |
| 5 Whys | Toyota / lean | `why1..3` (three is enough in practice) |
| Problem statement "[User] needs a way to [goal] because [reason]" | design-thinking POV | `problem` |
| How Might We | IDEO / Stanford d.school | `hmw` |
| MoSCoW | DSDM | `mustHaves` → EARS seeds |
| Riskiest Assumption Test | lean startup | `assumption` |
| Contextual inquiry / workaround mining | BABOK elicitation | `workaround` |
| Golden-master seams, strangler fig | Feathers / Fowler | brownfield branch |
| Segregation of duties | SOX/SOC2 | `team` + roles |

## 5. How people will use it day-to-day
1. **Founder/PM** runs the 10-minute discovery → gets brief, taste, first EARS spec + plan + tasks.
2. **Dev + agent** create an API key; the agent polls `GET /features/:id/next`, edits docs via `sync`, runs `G2/G3`, posts test evidence. Agents cannot approve.
3. **Approver** sees the Approvals Center; own artifacts show *recused*; signs G1/G5 with a note → hash-chained.
4. **Everyone** watches the dashboard's flow lanes; failed gates and expiring exceptions are the attention queue.
5. **Auditor** exports a signed bundle from the Audit explorer.

## 6. Roadmap after this build
- P1: WebSocket live updates (currently `router.refresh()` after actions), GitHub App (PR status = gate evidence), Jira sync.
- P2: MCP server package (`aisdlc-mcp`) exposing get_next/run_gate/submit_evidence/request_approval/file_finding.
- P3: SSO (OIDC), 2-approver policies per org, signed exports with key rotation, DPDP data-residency (ap-south-1).
- P4: LLM-assisted discovery follow-ups (ask the next best question), repo ingestion for brownfield baselines (code graph, TODO density, hotspots), taste inference from git history.

## 7. Skills gap analysis v2 (against grill-me / grilling, superpowers, ponytail, tdd, code-review, handoff)

Method: read every aisdlc SKILL.md and the CLI engine, then read the source of the most-installed process skills in the ecosystem (mattpocock/skills: grilling, grill-me, to-spec, to-tickets, tdd, code-review, handoff, writing-for-agents; obra/superpowers: brainstorming, verification-before-completion, systematic-debugging; DietrichGebert/ponytail). For each, asked "what would an agent running aisdlc do worse than an agent running that skill?".

| gap found in aisdlc v1 | source of the better practice | what changed |
|---|---|---|
| No interview primitive: discover asked one question per turn with no recommendations, no "find facts yourself", no design-tree/frontier ordering, no stakes-adaptive depth, no rejection-criteria question | grilling / grill-me | **`aisdlc-grill`** (new). Bridges to the official `grilling` when installed; embedded superset otherwise. Adds the aisdlc overlay: every decision lands on disk (brief, spec §6, plan Decisions, delta, ADR). Called from discover, spec, plan, delta, brownfield, retro, brainstorm. |
| Every request ran the full six-gate process; nothing for "can we…?" questions or one-file fixes, so agents skipped the process entirely for small work | superpowers brainstorming (spike / bounded / architectural, HARD-GATE, one-way ratchet) | **`aisdlc-brainstorm`** (new) + **lanes** in the engine (`spike` G3 · `quick` G2-G4 · `standard` G1-G6 · `regulated` G1-G6 ×2 approvers). `aisdlc new --lane`, `aisdlc lane` (ratchets up only), gates report `skipped`, `deriveFlow` is lane-aware, tests added. |
| No minimal-code discipline; plans and implementations over-built by default; new dependencies added without justification | ponytail | **`aisdlc-ponytail`** (new). Prefers the official skill (level from `docs/taste.md` `laziness:`); embedded ladder + rules otherwise; adds the never-lazy list specific to aisdlc (spec scenarios, evidence, gates, secrets, reversibility). Wired into brainstorm, plan (Decisions carry a ladder rung), implement (ladder step between Red and Green), review (over-built finding class), release, retro. |
| No debugging skill; bugs were either free-form or forced through discovery | superpowers systematic-debugging, mattpocock diagnosing-bugs, ponytail root-cause rule | **`aisdlc-debug`** (new). Iron law: no fix without a red run first; reproduce → minimise → hypothesise → instrument → root cause → regression test → evidence; bug-driven deltas. |
| No session continuity beyond the artifacts; decisions and dead ends lived in chat | handoff | **`aisdlc-handoff`** (new). `handoff.md` contract; flow reads it for context, disk still wins on state; `aisdlc next` flags its presence. |
| Flow mentioned "offer a retro" but no skill existed; lessons never changed constitution/taste | mattpocock retro (in-progress), incident post-mortem practice | **`aisdlc-retro`** (new). Evidence-based timeline, gate scorecard, over-build audit, proposed diffs to constitution/taste/glossary/skills. Engine now routes DONE → `aisdlc-retro`. |
| Skills assumed `npx aisdlc-cli` always works | hardening | `aisdlc-flow` gained a manual derivation procedure and a manual-evidence protocol for sandboxes without the CLI. |
| Spec had no seams, no glossary, no NFR checklist, no adversarial pass | to-spec (seams), grill-with-docs (CONTEXT.md / shared language), tdd (seams) | Spec §7 Seams, §4 NFR lines (auth, data, budget), adversarial pass, compact and spike modes; `docs/glossary.md` seeded by discover/taste and used by all skills. |
| Review was single-axis | code-review (Spec axis vs Standards axis, Fowler smells, parallel sub-agents) | `aisdlc-review` is two-axis, adds smell baseline, over-built lens (runs `ponytail-review` if present), stale-evidence check, finding classes. |
| Verify had no explicit anti-"should pass" language | verification-before-completion (Iron Law, gate function) | `aisdlc-verify` and `aisdlc-implement` carry the gate function and the banned-words list; static checks recorded as evidence too. |
| Tasks were a flat list | to-tickets (blocking edges, tracer bullets) | `{seam:, after:}` metadata, tracer-bullet sizing, "layers are not tasks". |
| Taste had no knob for laziness or interview pacing | ponytail levels, grilling | `laziness: lite|full|ultra`, `interview: one-per-turn|rounds|defaults`. |

Decision: bridge, do not fork. Ponytail and grilling are updated upstream and benchmarked; a copy inside aisdlc would rot. Each bridge skill checks for the official skill first, otherwise runs an embedded fallback and says so once. `aisdlc addon` installs them via the open `skills` CLI; `aisdlc doctor` reports presence.

## 8. Skills gap analysis v3 (against BMAD, Spec Kit, superpowers, OpenSpec, Agent OS, Kiro, Anthropic skill guidance)

Raw notes in [`COMPETITORS.md`](COMPETITORS.md). Method: read every aisdlc SKILL.md and the CLI engine, then the workflow maps, skill lists and artifact contracts of the six competing process kits plus Anthropic's own skill-authoring and AGENTS.md guidance. Question asked each time: *an agent running that kit does X — what does an agent running aisdlc fail to do?* v2 closed the missing-skill gaps (grill, brainstorm, ponytail, debug, handoff, retro all existed after it). v3 is about depth inside the skills that already exist, and about the artifacts the other kits produce and we do not.

| # | gap in aisdlc | source of the better practice | what changed |
|---|---|---|---|
| 1 | `aisdlc-plan` never reads `docs/constitution.md`; there is no step where the plan is checked against the project's principles | Spec Kit `speckit.plan` Constitution Check (ERROR if violations unjustified); BMAD `project-context.md` | `aisdlc-plan` gained a **Constitution check** step and a `## Constitution check` section: one row per principle — comply / violate+justify / n/a. An unjustified violation stops the plan. |
| 2 | The plan has no data model, no interface contracts, no resolution of research unknowns, and no runnable validation path | Spec Kit plan Phase 0/1 (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`); Kiro `design.md`; Agent OS spec folder | `aisdlc-plan` gained `## Data model`, `## Interface contracts`, `## Research & unknowns` (Decision / Rationale / Alternatives per unknown), and `## Smoke path` — the exact commands a stranger runs to see the feature work. Backend/infra plans also gain a sequence diagram, not just a dependency graph. |
| 3 | G2 is mechanical (EARS + trace + signature). Nothing checks that the three artifacts *agree* with each other, that a plan decision contradicts a constraint, or that a named seam exists in the repo | Spec Kit `/speckit.analyze` (read-only, report-only, fix at the owning artifact, re-run); Kiro Analyze Requirements (inconsistencies, ambiguities, conflicting constraints, gaps) | `aisdlc-tasks` gained a **read-only consistency pass** before G2: contradiction, conflict, dangling-seam, duplicate-requirement and phantom-task checks. It reports; it never silently edits. Contradictions are deltas. Then a three-way readiness verdict — **PASS / CONCERNS / FAIL** — before hand-off (BMAD readiness gate). |
| 4 | Tasks have `after:` edges but nothing derives execution waves; no subagent delegation pattern at all | Kiro dependency waves; superpowers `subagent-driven-development` + `dispatching-parallel-agents`; Agent OS `orchestrate-tasks` | `aisdlc-tasks` documents **waves** (independent tasks may run concurrently, shared seam = sequential). `aisdlc-implement` gained a delegation contract: construct the subagent's context from disk (task, SHALL, scenario, seam, decisions, taste lines), never from session history; **two-stage review — spec compliance first, then code quality** — before the box is ticked; subagent evidence must be its own files. |
| 5 | Nothing proves the baseline is green before the first task; nothing decides what happens to the branch when the work is accepted | superpowers `using-git-worktrees` (verify clean test baseline) and `finishing-a-development-branch` (four options: merge / PR / keep / discard) | `aisdlc-implement` starts with a **green-baseline check** (a dirty baseline is a bug report, not a starting point). `aisdlc-review` gained the **exit decision** — merge, open a PR, keep, discard — and the rule that a PR body leads with the spec summary and acceptance table so the reviewer reads the proposal before the diff (OpenSpec's review order). |
| 6 | Findings are produced but the author never learns how to respond to a human who disagrees or requests changes | superpowers `receiving-code-review`; `requesting-code-review` severity classes | `aisdlc-review` gained **When the human pushes back**: answer every finding with fix / accept-with-note / push-back-with-evidence; a requested behaviour change is a delta; re-run evidence after any fix; the reviewer argues from artifacts, never from authority. |
| 7 | Discovery always terminates in a brief. There is no "do not build" verdict, no alternatives scan, and no working-backwards artifact for user-facing work | BMAD `forge-idea` (hardens, proves out, or dies cheaply), `bmad-bmm-research`, PR-FAQ (Working Backwards) | `aisdlc-discover` gained four explicit closing verdicts — **build / spike first / defer / do not build** — an optional alternatives question, and an optional one-page **PR-FAQ** for user-facing standard/regulated work. Killing an idea cheaply is a valid, recorded outcome. |
| 8 | For frontend/mobile kinds, the spec carries no interaction contract and the plan carries no sequence/data flow | BMAD `bmad-ux` (`DESIGN.md` + `EXPERIENCE.md`: behavior, flow, IA, states, a11y); Kiro `design.md` | `aisdlc-spec` gained `## 8. UX & interaction` (primary journey, states incl. empty/loading/error, a11y bar) required for kinds `frontend`/`mobile`, seeded from `docs/taste.md` §UI. `aisdlc-plan` requires a sequence/data-flow diagram for backend/data/infra. |
| 9 | `docs/constitution.md` has no version, no amendment procedure, no record of when a principle changed — and retro edits it freely | Spec Kit constitution: `CONSTITUTION_VERSION` with semver bump rules, ratification/amendment dates, Sync Impact Report | `aisdlc-retro` gained the **constitution amendment procedure**: bump `Version:`, record the amendment date and what changed, one numbered line per principle. Also documents how to edit a skill in this repo (surgical edit + `npm run sync-skills`) so `packages/cli/skills` never drifts. |
| 10 | Deltas are `modify / add / remove` with no reason or migration required, and no rename | OpenSpec delta operations: ADDED / MODIFIED (full content) / REMOVED (**Reason + Migration**) / RENAMED (FROM:/TO:), `openspec validate` | `aisdlc-delta` gained the `rename` type, requires **Reason and Migration** on every `remove`, and requires MODIFIED rows to carry the full new requirement text, not a fragment. |
| 11 | Several skills have no refusal list — nothing tells the agent what *not* to do | Anthropic skill structure (procedure → examples → best practices); superpowers anti-pattern sections | Added missing **smells / anti-patterns / red flags** sections to `aisdlc-tasks`, `aisdlc-taste`, `aisdlc-quality`, `aisdlc-brownfield`, `aisdlc-release`; added worked **examples** to `aisdlc-implement` and `aisdlc-verify`. |
| 12 | Kiro's "Analyze Requirements" also applies *within* a spec: logical inconsistencies and conflicting constraints between two requirements | Kiro Analyze Requirements; Spec Kit `/speckit.clarify` + `/speckit.analyze` | `aisdlc-spec`'s adversarial pass now explicitly hunts **conflicts between requirements** (two requirements that cannot both hold) and **ambiguous quantifiers**, not just missing unhappy paths. |

**Decisions taken deliberately *not* to copy:**

- **No `references/` split.** Anthropic's rule is "split when approaching 500 lines". The largest aisdlc skill is ~130 lines / 9.2 KB. Splitting would add a file-read hop and a second place for truth to live, for a token saving of a few hundred at most. Revisit if any skill passes ~350 lines.
- **No personas/role agents** (BMAD analyst/PM/architect/dev/QA). aisdlc's equivalent is the *hats* it already assigns structurally — author, independent reviewer, human approver — and the SoD rule that makes them non-negotiable. Spawning a PM persona to write a brief adds ceremony without adding enforcement.
- **No separate story/sprint tracking file.** BMAD's `sprint-status.yaml` and OpenSpec's `changes/` are both "which unit of work is where". `feature.json` + `tasks.md` + `aisdlc status` already answer that from disk; a second tracker would drift from the first.
- **No template/preset/extension resolution stack** (Spec Kit) or injection syntax (Agent OS). aisdlc's extension points are `aisdlc.json`, `docs/taste.md`, `docs/constitution.md` — three files a human can read in a minute, resolved by the skills directly. Layered template resolution is a packaging feature, not a process one.
- **No hooks system.** Kiro's hooks are harness-specific; aisdlc's position is that anything that must run deterministically belongs in the CLI (`evidence`, `scan`, `gate`) or in the project's own CI, not in prose a model may or may not follow.

## 9. Skills gap analysis v4 — final head-to-head audit

Question asked after v3 shipped: *for each thing in `COMPETITORS.md`, are we now better, equal, or still behind?* Five rows were still behind and were fixed in this pass; the rest were already closed by v3 or are deliberate non-copies.

| competitor | their edge | status after v4 |
|---|---|---|
| superpowers | `using-git-worktrees` — isolated workspace, clean test baseline before the first task | **closed** — `aisdlc-implement` opens the feature's own branch/worktree, and the `--label baseline` evidence file now records `git rev-parse --short HEAD && <suite>` so the starting commit a later failure can be diffed against is in the evidence, not in chat. |
| superpowers | `plan-document-reviewer` — fresh-context review loop before anyone signs | **closed** — `aisdlc-plan` step 7 dispatches a subagent given only the paths to `spec.md` and `plan.md` (or an argued re-read when there are no subagents) asking three questions: every requirement planned, no decision contradicts spec/constitution, smoke path runnable as written. Loop until clean, *then* G1. |
| BMAD | `correct-course` — named path for mid-flight change when the spec is fine | **closed** — `aisdlc-flow` classifies "the plan is wrong, not the spec" → `aisdlc-plan` **Re-plan** section: edit the plan, uncheck invalidated tasks with a why, G1 goes stale by design, no delta unless behaviour changed. |
| BMAD | `baseline_commit` captured in the build loop | **closed** — same baseline evidence file as row 1. |
| OpenSpec | `openspec validate` — changes are machine-checked | **closed** — `aisdlc-cli check delta` parses the delta's Change table: unknown Type, `remove` without Reason/Migration, `rename` without FROM/TO/Reason, fragment `modify`, zero rows and missing sections are errors (engine `validateDelta`, covered by tests). The skill's two-directional read still runs alongside it for what parsing cannot see: an edit with no row. |
| Kiro / Agent OS | steering files loaded `always`; standards injected per task | **closed** — the `init` instruction block carries a `1b.` line telling every session to read taste + glossary + constitution before writing code. Selective per-kind injection remains deliberately unbuilt: one short `taste.md` beats a standards index, and kinds already steer verification through the plan's Verification strategy. |
| Kiro | user stories above the EARS lines | **accepted, not copied** — the job story is written once, in `docs/brief.md`, where discovery owns it; repeating it in the spec creates two sources for the same intent. |
| BMAD | personas (analyst/PM/architect/dev/QA) | **accepted, not copied** — author / independent reviewer / human approver are enforced structurally by SoD in the gate engine, not performed as characters. |
| Spec Kit | four-layer template resolution | **accepted, not copied** — see §8. |

Result: no remaining row where a competitor's practice is both better than ours and copyable at skill level. The process spine (gated state machine, hash-chained approvals, evidence files, segregation of duties, lanes, traceability) is still ours alone.

## 10. Skills gap analysis v5 — against `jsmastery-pro/skills` (9 skills, 28 sub-files, no CLI)

Studied 2026-10-07 by reading the repo, not its README: `CLAUDE.md`, `docs/conventions.md`,
`docs/workflow-guide.md`, both `.claude/agents/*.md`, all nine `SKILL.md` plus their `modes/`,
`flow/`, `ui/`, `agent-modes/`, `internal/`, `approaches/`, `patterns/` and `templates/` sub-files,
`scripts/check-portability.mjs` (425 lines, 11 rules), `scripts/analyze-token-usage.mjs`, and
`.github/workflows/check.yml`.

They are the strongest published example of two things we did not have: **cost discipline as an
engineered property**, and **a review guarantee about the model, not the person**. They are not
enforcement: their "no fabricated PASS" apparatus is four imperative sentences in a Markdown file the
same model can rationalise past, and they say so (`workflow-guide.md`: "a strong gate, not an absolute
guarantee (no prompt can be)"). We have a verifier. So the steals below went *into* the gates.

| their edge | what we did |
|---|---|
| Progressive disclosure: a 52-line router with the rigor in `modes/*.md`, read on the branch ("read exactly one", "read these now, only now, at write time"). | Adopted for the two branches that were genuinely long and genuinely rare: `aisdlc-flow/references/manual-derivation.md`, `aisdlc-review/references/pushback-and-exit.md`. Router cost 9,975 B → 8,986 B. The other 18 skills stay flat: `docs/conventions.md` now records the test (rare **and** long), and `sync-skills.mjs` copies whole folders so sub-files ship. |
| Byte budgets, and budgets on the **path** (`HOT_PATH_BUDGETS`: required files + the largest `oneOf`), printed as utilisation with `<-- shrink this`. | Adopted, in `check-skills.mjs`. Five named paths, utilisation table on a green run, CI failure on a breach. |
| `check-portability.mjs` as the product's test, because the corpus *is* the product. | Adopted and extended: theirs lints prose style, ours lints **claims against the code** - every documented command must exist in `cli.js`, every `aisdlc-*` token must name a real skill/slash-command/subagent, every `references/` file must be on disk, every relative link must resolve. The phantom `aisdlc verify` in our own README is the defect that justified it. |
| Model pinning lives in `.claude/agents/*.md` (`model: haiku`, whitelisted tools, output-size cap), so skill prose stays capability-first. | Adopted: `agents/aisdlc-scout.md`, `agents/aisdlc-researcher.md`, installed by `init` for Claude Code. Their rules 2/3/8 (no harness-specific alias in prose, no naming one client's subagent tool, `Agent` not `Task`) became validator portability checks. |
| Cross-model review: detect the author model from config (never self-introspection, because `/model` switching makes the answer stale), confirm with one MCQ, contrast table, refuse the author's own family, degrade ladder with plain disclosure. | Adopted **as a gate**. `reviewerNotes` + `modelFamily` in the engine; G4 fails a same-family pair, fails missing or placeholder values, and passes a declared `Cross-model: degraded (why)` while printing that it is not the guarantee. Their version is advice; ours cannot be skipped by skipping a sentence. |
| Value sourcing / input coverage: "Do NOT judge this by introspection… use a positive input coverage test, which is mechanical and harder to talk yourself out of." | Adopted as spec §9 and a G2 check. Every value the feature produces, computes or displays needs a named source, or an explicit `n/a: <why>`. |
| Three-state test signal (`configured` / `none-by-design` / `none-yet`) so a deliberate no-runner repo is not nagged and a lazy one is not excused. | Adopted as `aisdlc.json` → `test.gate`, read by G3. `none-by-design` waives the suite and prints the waiver; a recorded run is still required; `none-yet` waives nothing. |
| `docs/conventions.md`, an authoring constitution that makes a skill edit decidable without an argument. | Adopted, rewritten for this repo, and referenced by the checker output and CONTRIBUTING. |
| Artifact ownership table (Created by / Read by / Changed by) and the single-writer sentence. | Adopted as README "Who writes what", extended with the two files the CLI owns alone: `evidence/` and `approvals.json`. |
| Honest-limits copy: "a skipped step is recorded honestly as skipped", "the override is not free". | Adopted as framing in README "What aisdlc will not do" - our policy stays gates, not suggestions. |

Deliberately **not** adopted: the em/en-dash and hyphen prose lints (rules 10-11) - the corpus shows
the cost, "read only" and "cross cutting" where the compounding was strip-mined for a cosmetic rule,
with a `PARSED_LITERALS` allowlist to stop the lint fighting the artifact format it teaches; the
nine-fold duplicated `OUTPUT-STYLE` block (we have an installer, so house voice goes in the generated
instructions file once); "suggestions, never gates" as policy; and their `docs/`-as-website layout,
since we already ship a real site.

`analyze-token-usage.mjs` (their cache-read-vs-fresh-cost breakdown over Claude Code transcripts) is
the best remaining candidate and is still unbuilt: it measures chat cost, which is outside the
process state machine and does not belong in a gate. Tracked as a possible `aisdlc cost`.
