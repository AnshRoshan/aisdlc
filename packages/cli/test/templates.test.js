import { test } from "node:test";
import assert from "node:assert/strict";
import { CONSTITUTION, SPEC, PLAN, ACCEPTANCE, ROLLOUT, GUARDRAILS, RUNBOOK, TASTE, INSTRUCTIONS_BLOCK } from "../src/templates.js";
import { validateSpec, runGate, valueSourcing } from "../src/engine.js";

test("spec seed carries the value-sourcing table G2 requires", () => {
  const fe = SPEC("Demo", "backend", "standard");
  assert.match(fe, /^## 9\. Value sourcing$/m);
  const filled = fe.replace(/\[NEEDS CLARIFICATION:[^\]]*\]/g, "x");
  assert.ok(valueSourcing(filled).present, "the seeded section is the one the engine reads");
});

test("acceptance seed cannot pass G4 by leaving placeholders in", () => {
  const g = runGate("G4", { lane: "quick", author: "Ansh", evidence: [], acceptance: ACCEPTANCE("Demo") });
  assert.equal(g.passed, false);
  const cross = g.checks.find((c) => /different model/.test(c.name));
  assert.equal(cross.ok, false, "`Author model: <the model that wrote this code>` is a template, not a record");
  assert.ok(/record `Author model:`/.test(cross.detail), cross.detail);
  assert.ok(g.checks.some((c) => /no row names a recorded evidence file/.test(c.detail)));
});

test("constitution seed is a governed document", () => {
  const c = CONSTITUTION("demo");
  assert.match(c, /^Version: \d+\.\d+$/m);
  assert.match(c, /^Amended: \d{4}-\d{2}-\d{2}$/m);
  assert.match(c, /^## Project rules$/m);
});

test("spec seed: section 8 for UI kinds, n/a for others, blocks until filled", () => {
  const fe = SPEC("Demo", "frontend", "standard");
  assert.match(fe, /^## 8\. UX & interaction \(kinds frontend \/ mobile\)$/m);
  const markers = (fe.match(/\[NEEDS CLARIFICATION/g) || []).length;
  assert.ok(markers >= 11, `frontend seed must carry the section-8 markers, found ${markers}`);
  const filled = fe.replace(/\[NEEDS CLARIFICATION:[^\]]*\]/g, "x");
  assert.deepEqual(validateSpec(filled).errors, [], "filled seed must validate");
  const be = SPEC("Demo", "backend", "standard");
  assert.match(be, /^## 8\. UX & interaction \(n\/a: backend\)$/m);
  assert.ok(!/\[NEEDS CLARIFICATION[^\]]*(journey|states|A11y)/i.test(be), "non-UI seed asks no UX questions");
});

test("plan seed has every section the plan skill requires", () => {
  const p = PLAN("Demo");
  for (const h of [
    "## Architecture",
    "## Constitution check",
    "## Decisions",
    "## Research & unknowns",
    "## Data model",
    "## Interface contracts",
    "## Seams",
    "## Threat model",
    "## Work breakdown",
    "## Traceability",
    "## Verification strategy",
    "## Smoke path",
    "## Risks",
    "## Rollback thinking",
  ]) assert.ok(p.includes(h), `plan seed missing ${h}`);
  assert.match(p, /^## Traceability$/m, "G2 greps for this exact heading");
  assert.ok(p.includes("| Ladder rung |"), "Decisions table carries the ponytail rung column");
  assert.ok(p.includes("| Principle (from docs/constitution.md) | Verdict | Evidence / justification |"), "constitution check table shape");
});

test("acceptance seed carries finding triage and reviewer notes", () => {
  const a = ACCEPTANCE("Demo");
  assert.ok(a.includes("triage: <fix now | defer → task/issue | decision needed → <who>>"));
  assert.match(a, /^## Reviewer notes$/m);
  assert.match(a, /^Approved-by: ______  Date: ______$/m);
  assert.match(a, /^\| ID \| Requirement \| Scenario \| Evidence \| Result \|$/m);
});

test("rollout seed satisfies G5's rollback check; guardrails seed fails only on the placeholder flag", () => {
  const g5 = runGate("G5", { rollout: ROLLOUT("Demo"), policy: { minApprovals: {} }, approvals: [], author: "a" });
  const rb = g5.checks.find((x) => /Rollback/.test(x.name));
  assert.equal(rb.ok, true, "seed rollback steps must satisfy the gate");

  const seed = runGate("G6", { guardrails: GUARDRAILS, runbook: RUNBOOK("Demo"), kind: "backend", policy: { minApprovals: {} }, approvals: [], author: "a" });
  assert.equal(seed.checks.find((x) => /budgets/.test(x.name)).ok, true);
  assert.equal(seed.checks.find((x) => /Symptoms/.test(x.name)).ok, true);
  assert.equal(seed.checks.find((x) => /kill_switch/.test(x.name)).ok, false, "placeholder flag must not pass");

  const filled = runGate("G6", { guardrails: GUARDRAILS.replace("<FLAG_NAME>", "EXPORT_KILL"), runbook: RUNBOOK("Demo"), kind: "backend", policy: { minApprovals: {} }, approvals: [], author: "a" });
  assert.equal(filled.checks.find((x) => /kill_switch/.test(x.name)).ok, true);
});

test("instruction block always-loads steering; taste seed carries the sections taste skill reads", () => {
  const b = INSTRUCTIONS_BLOCK(["aisdlc-flow"]);
  assert.ok(b.includes("1b. Before writing any code, read `docs/taste.md`"), "always-on steering line");
  for (const h of ["## Code", "## Tests", "## Agent behaviour", "## Review", "## Definition of done", "## UI"]) {
    assert.ok(TASTE.includes(h), `taste seed missing ${h}`);
  }
});
