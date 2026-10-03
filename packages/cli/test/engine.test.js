import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedBy, validateSpec, parseTasks, traceMatrix, scanSecrets, runGate, deriveFlow, chainApproval, verifyChain, artifactHashFor } from "../src/engine.js";

const SPEC = `# Spec: X
## 3. Requirements (EARS)
### Requirement: Login
WHEN a user submits valid credentials THE SYSTEM SHALL create a session.
#### Scenario: happy
- GIVEN a user
- WHEN they log in
- THEN a session exists
### Requirement: Lockout
IF five failures occur THEN THE SYSTEM SHALL lock the account.
#### Scenario: lock
- THEN locked
## 5. Acceptance bar
Approved-by: Priya  Date: 2026-01-01
## 6. Open questions
| # | Question | Owner | Status |
|---|---|---|---|
| 1 | q | me | done |
## 9. Value sourcing
| Value | Source | How obtained |
|---|---|---|
| session id | Login | returned by the auth call |
| lockout flag | Lockout | counter in the session store |
`;

test("approvedBy ignores underscores and Date:", () => {
  assert.equal(approvedBy("Approved-by: ______  Date: ______"), null);
  assert.equal(approvedBy("Approved-by:   Date: 2026"), null);
  assert.equal(approvedBy("Approved-by: Priya  Date: 2026-01-01"), "Priya");
  assert.equal(approvedBy("Approved-by: Ansh Roshan\n"), "Ansh Roshan");
});

test("validateSpec passes a good spec and flags a bad one", () => {
  const v = validateSpec(SPEC);
  assert.deepEqual(v.errors, []);
  assert.equal(v.requirements.length, 2);
  assert.equal(v.signedBy, "Priya");
  const bad = validateSpec("### Requirement: A\nsomething [NEEDS CLARIFICATION: x]\n");
  assert.ok(bad.errors.some((e) => /SHALL/.test(e)));
  assert.ok(bad.errors.some((e) => /Scenario/.test(e)));
  assert.ok(bad.errors.some((e) => /CLARIFICATION/.test(e)));
});

test("parseTasks + traceMatrix", () => {
  const tasks = parseTasks("- [x] T1 [R:Login] do login\n- [ ] T2 [R:Lockout, R:Login] lock\n- [ ] T3 [R:Ghost] nope");
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].done, true);
  assert.deepEqual(tasks[1].reqRefs, ["Lockout", "Login"]);
  const tr = traceMatrix(SPEC, tasks);
  assert.deepEqual(tr.uncovered, []);
  assert.deepEqual(tr.unknown, ["T3→ghost"]);
});

test("scanSecrets catches real keys, ignores placeholders", () => {
  assert.equal(scanSecrets("AWS_KEY=AKIA" + "ABCDEFGHIJKLMNOP").length, 1);
  assert.equal(scanSecrets("key = <your-aws-key> AKIA" + "ABCDEFGHIJKLMNOP").length, 0);
  assert.equal(scanSecrets('password: "correct-horse-battery"').length, 1); // aisdlc:allow-secret
  assert.equal(scanSecrets('password: "${DB_PASSWORD}"').length, 0);
});

test("gates: SoD, stale approvals, evidence and flow", () => {
  const base = { spec: SPEC, plan: "# Plan\n\n## Architecture\nA -> B\n\n## Traceability\n| Login | T1 |\n", tasks: "- [ ] T1 [R:Login] a\n- [ ] T2 [R:Lockout] b\n", author: "Ansh", approvals: [], evidence: [], secretFindings: [] };
  let g1 = runGate("G1", base);
  assert.equal(g1.passed, false);
  // author self-approval rejected
  const self = { ...base, approvals: [{ gate: "G1", by: "Ansh", hash: artifactHashFor("G1", base) }] };
  assert.equal(runGate("G1", self).passed, false);
  const good = { ...base, approvals: [{ gate: "G1", by: "Priya", hash: artifactHashFor("G1", base) }] };
  assert.equal(runGate("G1", good).passed, true);
  // editing plan makes approval stale
  const edited = { ...good, plan: good.plan + "\nmore" };
  assert.equal(runGate("G1", edited).passed, false);
  assert.equal(deriveFlow(edited).state, "PLAN");
  assert.equal(deriveFlow(good).state, "BUILD");
});

test("flow walks forward with evidence", () => {
  const ctx = { spec: SPEC, plan: "# Plan\n\n## Architecture\nA -> B and more words here to exceed stub\n\n## Traceability\nx\n", tasks: "- [x] T1 [R:Login] a\n- [x] T2 [R:Lockout] b\n", author: "Ansh", approvals: [], evidence: [], secretFindings: [] };
  ctx.approvals.push({ gate: "G1", by: "Priya", hash: artifactHashFor("G1", ctx) });
  assert.equal(deriveFlow(ctx).state, "VERIFY");
  ctx.evidence.push({ file: "2026-01-02-full.json", label: "full", exitCode: 1, command: "npm test" });
  assert.equal(deriveFlow(ctx).state, "VERIFY");
  ctx.evidence.push({ file: "2026-01-02-full.json", label: "full", exitCode: 0, command: "npm test" });
  assert.equal(deriveFlow(ctx).state, "ACCEPT");
  ctx.acceptance = "| ID | Req | Scenario | Evidence | Result |\n|---|---|---|---|---|\n| A1 | Login | happy | evidence/2026-01-02-full.json | pass |\n\nAuthor model: gpt-5.2 · Reviewer model: claude-opus-4.1 · Cross-model: independent\n\nApproved-by: Priya  Date: 2026-01-02\n";
  assert.equal(deriveFlow(ctx).state, "RELEASE");
  ctx.rollout = "# Rollout\n\n## Strategy\nflag\n\n## Rollback\n1. flip flag\n2. revert\n";
  ctx.approvals.push({ gate: "G5", by: "Priya", hash: artifactHashFor("G5", ctx) });
  assert.equal(deriveFlow(ctx).state, "OPERATE");
  ctx.guardrails = "budgets:\n  latency_p95_ms: 800\nkill_switch: FLAG_X\n";
  ctx.runbook = "# Runbook\n## Symptoms → Actions\n| a | b | c |\n";
  assert.equal(deriveFlow(ctx).state, "DONE");
});

test("approval hash chain", () => {
  const list = [];
  list.push(chainApproval(list, { gate: "G1", by: "Priya", hash: "abc", at: "t1" }));
  list.push(chainApproval(list, { gate: "G5", by: "Priya", hash: "def", at: "t2" }));
  assert.equal(verifyChain(list).ok, true);
  list[0].note = "tampered";
  assert.equal(verifyChain(list).ok, false);
});

/* ───────────── lanes ───────────── */
import { LANE_GATES, laneRequires, specSignatureRequired } from "../src/engine.js";

const signedSpec = `# Spec
## 3
### Requirement: Export CSV
WHEN the user clicks export THE SYSTEM SHALL download a CSV.
#### Scenario: happy
- THEN a file is downloaded
## 5
Approved-by: Priya  Date: 2026-01-01
## 9. Value sourcing
| Value | Source | How obtained |
|---|---|---|
| csv bytes | Export CSV | streamed from the query |
`;
const unsignedSpec = signedSpec.replace("Approved-by: Priya  Date: 2026-01-01", "Approved-by: ______  Date: ______");
const base = { hasBrief: true, author: "agent-a", approvals: [], evidence: [], secretFindings: [], policy: { minApprovals: {} }, plan: "", tasks: "", acceptance: "", rollout: "", guardrails: "", runbook: "" };

test("lanes: gate requirements ratchet by lane", () => {
  assert.deepEqual(LANE_GATES.spike, ["G3"]);
  assert.deepEqual(LANE_GATES.quick, ["G2", "G3", "G4"]);
  assert.equal(LANE_GATES.standard.length, 6);
  assert.equal(laneRequires("quick", "G1"), false);
  assert.equal(laneRequires("unknown-lane", "G1"), true, "unknown lane falls back to standard");
  assert.equal(specSignatureRequired("spike"), false);
  assert.equal(specSignatureRequired("quick"), true);
});

test("lanes: spike is DONE once probe evidence exists; no signature needed", () => {
  const f = deriveFlow({ ...base, lane: "spike", spec: unsignedSpec, evidence: [{ label: "spike", exitCode: 0, command: "node bench.js" }] });
  assert.equal(f.state, "DONE");
  assert.equal(f.skill, "aisdlc-retro");
  assert.equal(f.gates.G1.skipped, true);
  assert.equal(f.gates.G3.required, true);
});

test("lanes: quick skips G1 and goes straight to TASKS/BUILD after a signed spec", () => {
  const f = deriveFlow({ ...base, lane: "quick", spec: signedSpec, plan: "# Plan\n## Traceability\n| Export CSV | T1 |", tasks: "- [ ] T1 [R:Export CSV] stream rows" });
  assert.equal(f.state, "BUILD");
  assert.equal(f.gates.G1.skipped, true);
  const std = deriveFlow({ ...base, lane: "standard", spec: signedSpec, plan: "# Plan\n## Traceability\n| Export CSV | T1 |", tasks: "- [ ] T1 [R:Export CSV] stream rows" });
  assert.equal(std.state, "PLAN", "standard lane still needs G1 approval");
});

test("lanes: quick is DONE after G4, never asks for rollout/runbook", () => {
  const acceptance = "| ID | Requirement | Scenario | Evidence | Result |\n|---|---|---|---|---|\n| A1 | Export CSV | happy | evidence/x-green.json | pass |\n\nAuthor model: claude-opus-4.1 · Reviewer model: gpt-5.2 · Cross-model: independent\n\nApproved-by: Priya  Date: 2026-01-02";
  const f = deriveFlow({ ...base, lane: "quick", spec: signedSpec, plan: "# Plan\n## Traceability\n| Export CSV | T1 |", tasks: "- [x] T1 [R:Export CSV] stream rows", evidence: [{ file: "x-green.json", label: "full", exitCode: 0, command: "npm test" }], acceptance });
  assert.equal(f.state, "DONE");
  assert.equal(f.gates.G5.skipped, true);
  assert.equal(f.gates.G6.skipped, true);
});

/* ---------------- value sourcing + cross-model review ---------------- */

test("G2: an untraced value with no named source blocks the gate", () => {
  const noTable = SPEC.replace(/## 9\. Value sourcing[\s\S]*$/, "");
  const g = runGate("G2", { spec: noTable, plan: "# Plan\n## Traceability\nx", tasks: "- [ ] T1 [R:Login] a", lane: "quick" });
  assert.equal(g.passed, false);
  assert.ok(g.checks.some((c) => c.name.includes("named source") && !c.ok && /no `## 9/.test(c.detail)));

  const blank = SPEC.replace("| lockout flag | Lockout | counter in the session store |", "| lockout flag |  |  |");
  const g2 = runGate("G2", { spec: blank, plan: "# Plan\n## Traceability\nx", tasks: "- [ ] T1 [R:Login] a", lane: "quick" });
  assert.ok(g2.checks.some((c) => /no source for: lockout flag/.test(c.detail)));

  const waived = SPEC.replace(/## 9\. Value sourcing[\s\S]*$/, "## 9. Value sourcing\nn/a: internal refactor, nothing new reaches a user\n");
  const g3 = runGate("G2", { spec: waived, plan: "# Plan\n## Traceability\nx", tasks: "- [ ] T1 [R:Login] a", lane: "quick" });
  assert.ok(g3.checks.some((c) => c.name.includes("named source") && c.ok && /waived/.test(c.detail)), "an honest n/a with a reason passes");
});

test("G3: test.gate none-by-design waives the suite, never the recorded run", () => {
  const g = (testPolicy, evidence) => runGate("G3", { lane: "quick", testPolicy, evidence, secretFindings: [], tasks: "- [x] T1 [R:Login] a" });
  const runs = [{ file: "s.json", label: "smoke", exitCode: 0, command: "node smoke.js" }];
  assert.equal(g("none-by-design", runs).passed, true, "a repo that ships no runner can still close G3 on a recorded run");
  assert.ok(g("none-by-design", runs).checks.some((c) => /waived by test.gate/.test(c.detail)), "the waiver is printed, not silent");
  assert.equal(g("none-yet", runs).passed, false, "never set up is not an escape hatch");
  assert.equal(g("none-by-design", []).passed, false, "no run at all is IMPLEMENTED-NOT-VERIFIED by design or not");
  assert.equal(g("configured", runs).passed, false, "a repo with a runner still owes the full suite");
});

test("G4: the reviewing model must differ from the authoring model", () => {
  const rows = "| ID | Req | Scenario | Evidence | Result |\n|---|---|---|---|---|\n| A1 | Login | happy | e.json | pass |\n";
  const ev = [{ file: "e.json", label: "full", exitCode: 0, command: "npm test" }];
  const ctx = (notes) => ({ lane: "quick", acceptance: rows + notes, evidence: ev, author: "Ansh" });

  assert.ok(runGate("G4", ctx("\n\nApproved-by: Priya")).checks.some((c) => /different model/.test(c.name) && !c.ok), "no models recorded is not a pass");
  const same = runGate("G4", ctx("\n\nAuthor model: claude-opus-4.1 · Reviewer model: gpt-5.2 · Cross-model: independent\n\nApproved-by: Priya"));
  assert.ok(same.checks.find((c) => /different model/.test(c.name)).ok, "gpt reviewing claude is independent");
  const twin = runGate("G4", ctx("\n\nAuthor model: claude-opus-4.1 · Reviewer model: claude-opus-4.5 · Cross-model: independent\n\nApproved-by: Priya"));
  assert.equal(twin.passed, false, "same family fails");
  assert.ok(twin.checks.some((c) => /shares its blind spots|both on/.test(c.detail)), twin.checks.find((c) => /different model/.test(c.name)).detail);
  const degraded = runGate("G4", ctx("\n\nAuthor model: claude-opus-4.1 · Reviewer model: claude-opus-4.1 · Cross-model: degraded (only one family available here)\n\nApproved-by: Priya"));
  assert.ok(degraded.checks.find((c) => /different model/.test(c.name)).ok, "a declared degradation is honest, not a lie");
  assert.ok(/not the cross-model guarantee/.test(degraded.checks.find((c) => /different model/.test(c.name)).detail));
  const filledBelowSeed = runGate("G4", ctx("\n\nAuthor model: <the model that wrote this code> · Reviewer model: <a different family>\n\nAuthor model: claude-sonnet-5 · Reviewer model: deepseek-v4\n\nApproved-by: Priya"));
  assert.ok(filledBelowSeed.checks.find((c) => /different model/.test(c.name)).ok, "a filled line under an untouched template line still counts");
});

test("G4: evidence a row cites must exist in the log", () => {
  const g = runGate("G4", { lane: "quick", author: "Ansh", evidence: [{ file: "real.json", label: "full", exitCode: 0, command: "npm test" }], acceptance: "| ID | R | S | Evidence | Result |\n|---|---|---|---|---|\n| A1 | Login | happy | evidence/ghost.json | pass |\n\nApproved-by: Priya" });
  assert.equal(g.passed, false);
  assert.ok(g.checks.some((c) => /not recorded: ghost\.json|ghost\.json/.test(c.detail)));
});

test("lanes: regulated requires two SoD approvals on G1", () => {
  const plan = "# Plan\n## Architecture\nlots of words here to pass the stub check, more than forty characters\n## Traceability\n| Export CSV | T1 |";
  const hash = artifactHashFor("G1", { plan });
  const one = deriveFlow({ ...base, lane: "regulated", spec: signedSpec, plan, tasks: "- [ ] T1 [R:Export CSV] x", approvals: [{ gate: "G1", by: "Priya", hash }] });
  assert.equal(one.state, "PLAN");
  const two = deriveFlow({ ...base, lane: "regulated", spec: signedSpec, plan, tasks: "- [ ] T1 [R:Export CSV] x", approvals: [{ gate: "G1", by: "Priya", hash }, { gate: "G1", by: "Ravi", hash }] });
  assert.notEqual(two.state, "PLAN");
});

/* ---------------- deltas ---------------- */
import { validateDelta } from "../src/engine.js";

const DELTA = `# Delta D1: rename export, drop the legacy path

## Trigger
Human asked for the rename; the legacy path has no callers.

## Change
| Requirement | Before | After | Type |
|---|---|---|---|
| Export CSV | WHEN clicked THE SYSTEM SHALL download a CSV | WHEN clicked THE SYSTEM SHALL stream a CSV | modify |
| Old Export | WHEN clicked THE SYSTEM SHALL download | - | remove |
| New Name | - | WHEN clicked THE SYSTEM SHALL export | rename |

## Removed requirements
- Reason: superseded by Export CSV
- Migration: none - no callers (evidence: src/old.js)

## Renames
- FROM: Old Name  ->  TO: New Name
- Reason: clearer

## Impact
Tasks affected: T2 - Approvals invalidated: G1, G4 - Risk: low

## Decision
Requested-by: human   Approved-by: Priya  Date: 2026-09-27
`;

test("validateDelta accepts a well-formed delta", () => {
  const v = validateDelta(DELTA);
  assert.deepEqual(v.errors, []);
  assert.deepEqual(v.warnings, []);
  assert.equal(v.rows.length, 3);
  assert.deepEqual(v.rows.map((r) => r.type), ["modify", "remove", "rename"]);
});

test("validateDelta rejects: unknown type, missing migration, empty change, missing sections, fragment modify", () => {
  const badType = validateDelta(DELTA.replace("| remove |", "| delete |"));
  assert.ok(badType.errors.some((e) => /Unknown Type/.test(e)), "unknown type must fail");

  const noMig = validateDelta(DELTA.replace(/^- Migration:.*$/m, ""));
  assert.ok(noMig.errors.some((e) => /Migration/.test(e)), "remove without Migration must fail");

  const noReason = validateDelta(DELTA.replace(/^- Reason:.*$/m, "").replace(/^- Reason:.*$/m, ""));
  assert.ok(noReason.errors.some((e) => /Reason/.test(e)), "remove/rename without Reason must fail");

  const dataRows = /^-? ?\| (Export CSV|Old Export|New Name) /;
  const empty = validateDelta(DELTA.split("\n").filter((l) => !dataRows.test(l)).join("\n"));
  assert.ok(empty.errors.some((e) => /zero rows/.test(e)), "empty change table must fail");

  const fragment = validateDelta(DELTA.replace("WHEN clicked THE SYSTEM SHALL stream a CSV", "WHEN clicked THE SYSTEM SHALL download a CSV"));
  assert.ok(fragment.errors.some((e) => /full new requirement text/.test(e)), "After === Before must fail");

  const stub = validateDelta("# Delta D2: x\n");
  assert.ok(stub.errors.length >= 4, "stub delta reports every missing section");

  const unsigned = validateDelta(DELTA.replace("Approved-by: Priya  Date: 2026-09-27", ""));
  assert.ok(unsigned.warnings.some((w) => /Approved-by/.test(w)), "applied-without-agreement is a warning");
});
