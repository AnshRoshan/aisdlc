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
