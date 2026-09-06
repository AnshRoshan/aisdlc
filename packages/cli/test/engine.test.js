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
  assert.equal(scanSecrets('password: "correct-horse-battery"').length, 1);
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
  ctx.evidence.push({ label: "full", exitCode: 1, command: "npm test" });
  assert.equal(deriveFlow(ctx).state, "VERIFY");
  ctx.evidence.push({ label: "full", exitCode: 0, command: "npm test" });
  assert.equal(deriveFlow(ctx).state, "ACCEPT");
  ctx.acceptance = "| ID | Req | Scenario | Evidence | Result |\n|---|---|---|---|---|\n| A1 | Login | happy | evidence/x.json | pass |\n\nApproved-by: Priya  Date: 2026-01-02\n";
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
  const acceptance = "| ID | Requirement | Scenario | Evidence | Result |\n|---|---|---|---|---|\n| A1 | Export CSV | happy | evidence/x-green.json | pass |\n\nApproved-by: Priya  Date: 2026-01-02";
  const f = deriveFlow({ ...base, lane: "quick", spec: signedSpec, plan: "# Plan\n## Traceability\n| Export CSV | T1 |", tasks: "- [x] T1 [R:Export CSV] stream rows", evidence: [{ label: "full", exitCode: 0, command: "npm test" }], acceptance });
  assert.equal(f.state, "DONE");
  assert.equal(f.gates.G5.skipped, true);
  assert.equal(f.gates.G6.skipped, true);
});

test("lanes: regulated requires two SoD approvals on G1", () => {
  const plan = "# Plan\n## Architecture\nlots of words here to pass the stub check, more than forty characters\n## Traceability\n| Export CSV | T1 |";
  const hash = artifactHashFor("G1", { plan });
  const one = deriveFlow({ ...base, lane: "regulated", spec: signedSpec, plan, tasks: "- [ ] T1 [R:Export CSV] x", approvals: [{ gate: "G1", by: "Priya", hash }] });
  assert.equal(one.state, "PLAN");
  const two = deriveFlow({ ...base, lane: "regulated", spec: signedSpec, plan, tasks: "- [ ] T1 [R:Export CSV] x", approvals: [{ gate: "G1", by: "Priya", hash }, { gate: "G1", by: "Ravi", hash }] });
  assert.notEqual(two.state, "PLAN");
});
