import test from "node:test";
import assert from "node:assert/strict";
import { approvedBy, artifactHashFor, chainApproval, verifyChain, runGate, deriveFlow, valueSourcing, modelFamily, reviewerNotes, scanSecrets, validateDelta } from "../src/engine.js";

const spec = `# Spec
### Requirement: Export
WHEN requested THE SYSTEM SHALL export records.
#### Scenario: Happy
- THEN records exist
#### Scenario: Empty
- THEN an empty file exists
## 5. Acceptance bar
Approved-by: Priya
## 9. Value sourcing
| Value | Source | How obtained |
|---|---|---|
| records | Export | query |
`;
const plan = "# Plan\n## Architecture\nExport uses the existing record store and public seam.\n## Traceability\nExport -> T1\n";
const evidence = [{ file: "run.json", command: "node --test", label: "full", exitCode: 0, startedAt: "2026-01-01T00:00:00Z", sourceSha256: "source" }];
const acceptance = `| ID | Requirement | Scenario | Evidence | Result |
|---|---|---|---|---|
| A1 | Export | Happy | evidence/run.json | pass |
| A2 | Export | Empty | evidence/run.json | pass |
Author model: claude-opus-4.1 · Reviewer model: gpt-5.2 · Cross-model: independent
Approved-by: Priya
`;
const ctx = { spec, plan, tasks: "- [x] T1 [R:Export] export records", acceptance, evidence, author: "Ansh", lane: "quick", approvals: [], sourceSha256: "source" };
const sign = (gate, by, context) => ({ gate, by, hash: artifactHashFor(gate, context) });

test("blank and placeholder signatures cannot consume a later line", () => {
  for (const text of ["Approved-by:\nDate: today", "Approved-by: \r\nnext line", "Approved-by: <human>", "Approved-by: TODO", "Approved-by: ______  Date: ______"]) assert.equal(approvedBy(text), null, text);
  assert.equal(approvedBy("Approved-by: ______\nApproved-by: Priya  Date: today"), "Priya");
  assert.equal(approvedBy("Requested-by: Sam   Approved-by: Priya  Date: today"), "Priya");
});

test("regulated approvals require distinct normalized identities", () => {
  const regulated = { ...ctx, lane: "regulated" };
  const duplicated = [sign("G1", "Priya", regulated), sign("G1", " priya ", regulated)];
  assert.equal(runGate("G1", { ...regulated, approvals: duplicated }).passed, false);
  assert.equal(runGate("G1", { ...regulated, approvals: [...duplicated, sign("G1", "Ravi", regulated)] }).passed, true);
  assert.equal(runGate("G1", { ...ctx, approvals: [sign("G1", " ansh ", ctx)] }).passed, false);
});

test("regulated G4 cannot be bypassed by a single literal signature", () => {
  const regulated = { ...ctx, lane: "regulated" };
  assert.equal(runGate("G4", regulated).passed, false);
  assert.equal(runGate("G4", { ...regulated, approvals: [sign("G4", "Priya", regulated), sign("G4", "Ravi", regulated)] }).passed, true);
  assert.equal(runGate("G4", { ...ctx, policy: { minApprovals: { G4: 2 } } }).passed, false);
});

test("approvals bind signed intent and invalidate after a spec edit", () => {
  for (const gate of ["G1", "G4", "G5"]) assert.notEqual(artifactHashFor(gate, ctx), artifactHashFor(gate, { ...ctx, spec: spec + "\nintent changed" }));
  assert.notEqual(artifactHashFor("G2", { spec: "ab", plan: "c" }), artifactHashFor("G2", { spec: "a", plan: "bc" }));
  assert.equal(runGate("G1", { ...ctx, approvalsIntact: false, approvals: [sign("G1", "Priya", ctx)] }).passed, false);
  assert.equal(runGate("G4", { ...ctx, approvalsIntact: false }).passed, false);
});

test("every acceptance row names real green evidence and a spec scenario", () => {
  assert.equal(runGate("G4", ctx).passed, true);
  for (const changed of [
    acceptance.replace("| A2 | Export | Empty | evidence/run.json", "| A2 | Export | Empty | manually tested"),
    acceptance.replace("evidence/run.json", "evidence/ghost.json"),
    acceptance.replace("| A2 | Export | Empty", "| A1 | Export | Empty"),
    acceptance.replace("| A2 | Export | Empty", "| A2 | Export | Nonexistent"),
    acceptance.split("\n").filter((l) => !l.startsWith("| A2")).join("\n"),
    acceptance.replace("evidence/run.json", "evidence/run.json and ghost.json"),
  ]) assert.equal(runGate("G4", { ...ctx, acceptance: changed }).passed, false, changed);
  assert.equal(runGate("G4", { ...ctx, evidence: [{ ...evidence[0], exitCode: 1 }] }).passed, false);
});

test("G4 keeps agent ownership until technical review checks pass", () => {
  const missingModels = { ...ctx, acceptance: acceptance.replace(/Author model:.*\n/, "").replace("Approved-by: Priya", "Approved-by: ______") };
  assert.equal(deriveFlow(missingModels).owner, "agent");
  assert.equal(deriveFlow({ ...ctx, acceptance: acceptance.replace("Approved-by: Priya", "Approved-by: ______") }).owner, "human");
});

test("placeholder n/a and vague degraded declarations do not waive checks", () => {
  assert.equal(valueSourcing("## 9. Value sourcing\nn/a: <why>").waived, false);
  assert.equal(valueSourcing("## 9. Value sourcing\nn/a: internal refactor, no output changes").waived, true);
  for (const note of ["degraded", "not degraded", "degraded (why)", "degraded (<reason>)"]) assert.equal(reviewerNotes("Cross-model: " + note).degraded, false);
  assert.equal(reviewerNotes("Cross-model: degraded (only one provider is available)").degraded, true);
});

test("family independence is provider-level, not a model alias change", () => {
  assert.equal(modelFamily("claude-opus-4.1"), modelFamily("sonnet-5"));
  assert.equal(modelFamily("gpt-5.2"), modelFamily("o3"));
  assert.notEqual(modelFamily("claude-sonnet-5"), modelFamily("deepseek-v4"));
});

test("G3 chooses newest run by timestamp, rejects dirty source and corrupt log", () => {
  assert.equal(runGate("G3", ctx).passed, true);
  const newerRed = { ...evidence[0], startedAt: "2026-01-02T00:00:00Z", exitCode: 1 };
  assert.equal(runGate("G3", { ...ctx, evidence: [newerRed, ...evidence] }).passed, false);
  for (const over of [{ sourceSha256: "changed" }, { evidenceErrors: ["checksum mismatch"] }, { evidence: [{ ...evidence[0], sourceChangedDuringRun: true }] }]) assert.equal(runGate("G3", { ...ctx, ...over }).passed, false);
  const smoke = [{ ...evidence[0], label: "smoke" }, { ...newerRed, label: "smoke" }];
  assert.equal(runGate("G3", { ...ctx, testPolicy: "none-by-design", evidence: smoke }).passed, false);
});

test("scanner checks all matches and never exempts a neighboring real secret", () => {
  const key = "AKIA" + "ABCDEFGHIJKLMNOP";
  assert.equal(scanSecrets("example " + key + " " + key).length, 2);
  assert.equal(scanSecrets('password: "${ENV_PASSWORD}"').length, 0);
  assert.equal(scanSecrets(key + " # arsdlc:allow-secret").length, 0);
});

test("guardrail placeholders and blank kill switches cannot borrow the next line", () => {
  assert.equal(runGate("G6", { guardrails: "budgets:\n  latency_p95_ms: <baseline>\nkill_switch: FLAG", runbook: "Symptoms" }).passed, false);
  assert.equal(runGate("G6", { guardrails: "budgets:\n  latency_p95_ms: 100\nkill_switch:\nalerts: FLAG", runbook: "Symptoms" }).passed, false);
  assert.equal(runGate("G6", { guardrails: "budgets:\n  latency_p95_ms: 100\nkill_switch: FLAG", runbook: "Symptoms" }).passed, true);
});

test("rollback steps cannot be borrowed from the next section", () => {
  const gate = runGate("G5", { rollout: "# Rollout\nA sufficiently detailed strategy is written here.\n## Rollback\n\n## Comms\n1. email users" });
  assert.equal(gate.checks.find((c) => c.name.includes("Rollback")).ok, false);
});

test("malformed approval chains fail without throwing", () => {
  for (const list of [null, {}, [null], [{ id: "forged" }]]) assert.equal(verifyChain(list).ok, false);
  const list = [chainApproval([], { gate: "G1", by: "Priya", hash: "abc", at: "today" })];
  assert.equal(verifyChain(list).ok, true);
  list[0].by = "Ravi";
  assert.equal(verifyChain(list).ok, false);
});

test("delta decision must contain a filled signature, not the seed line", () => {
  const delta = "# Delta D1: change\n## Trigger\nchange\n## Change\n| Requirement | Before | After | Type |\n|---|---|---|---|\n| Export | - | new behavior | add |\n## Impact\nT1\n## Decision\nApproved-by: ______";
  assert.ok(validateDelta(delta).warnings.some((w) => w.includes("Approved-by")));
});
