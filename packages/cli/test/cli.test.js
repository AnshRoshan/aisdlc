import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync, rmSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync, execFileSync } from "node:child_process";
import { HARNESSES } from "../src/harnesses.js";
import { sourceFingerprint, listSkills, readJson, upsertBlock, copyOrLink, projectRoot } from "../src/fsx.js";

const cli = fileURLToPath(new URL("../bin/arsdlc.js", import.meta.url));
function project(t, { git = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "arsdlc-test-"));
  t.after(() => { assert.ok(resolve(root).startsWith(resolve(tmpdir()) + "\\") || resolve(root).startsWith(resolve(tmpdir()) + "/")); rmSync(root, { recursive: true, force: true }); });
  if (git) {
    for (const args of [["init", "-q"], ["config", "user.name", "Fixture Author"], ["config", "user.email", "fixture@example.invalid"]]) execFileSync("git", args, { cwd: root, stdio: "ignore" });
  }
  return root;
}
function run(root, args, env = {}) {
  const r = spawnSync(process.execPath, [cli, "--cwd", root, ...args], { encoding: "utf8", env: { ...process.env, AISDLC_AGENT: "", ...env }, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(r.error, undefined);
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const good = (r) => { assert.equal(r.code, 0, r.err + r.out); return r; };
const json = (r) => JSON.parse(r.out);
const put = (root, path, data) => { const file = join(root, path); mkdirSync(resolve(file, ".."), { recursive: true }); writeFileSync(file, typeof data === "string" ? data : JSON.stringify(data, null, 2)); };
const get = (root, path) => readFileSync(join(root, path), "utf8");
const newFeature = (root, lane = "quick") => good(run(root, ["new", "Export", "--kind", "backend", "--lane", lane, "--author", "Fixture Author"]));
const dir = "docs/features/export/";
const spec = "# Spec\n### Requirement: Export\nWHEN requested THE SYSTEM SHALL export a file.\n#### Scenario: Happy\n- THEN a file exists\n## 5. Acceptance bar\nApproved-by: Fixture Reviewer\n## 9. Value sourcing\n| Value | Source | How obtained |\n|---|---|---|\n| bytes | Export | records query |\n";
function prepare(root, lane = "quick") {
  newFeature(root, lane);
  put(root, dir + "spec.md", spec);
  put(root, dir + "plan.md", "# Plan\n## Architecture\nExport reads the existing store through the public seam.\n## Traceability\nExport -> T1\n");
  put(root, dir + "tasks.md", "- [x] T1 [R:Export] export records\n");
  put(root, "src.js", "export const value = 1;\n");
}
function record(root, code = "console.log('verified')", label = "full") {
  return run(root, ["evidence", "export", "--label", label, "--", process.execPath, "-e", code]);
}
function evidenceFile(root) { return readdirSync(join(root, dir, "evidence")).filter((f) => f.endsWith(".json")).at(-1); }
function accept(root) {
  const file = evidenceFile(root);
  put(root, dir + "acceptance.md", `| ID | Requirement | Scenario | Evidence | Result |\n|---|---|---|---|---|\n| A1 | Export | Happy | evidence/${file} | pass |\nAuthor model: claude-opus-4.1 · Reviewer model: gpt-5.2\nApproved-by: Fixture Reviewer\n`);
}

test("every informational command runs and bad flags fail clearly", (t) => {
  const root = project(t);
  for (const args of [["help"], ["version"], ["--version"], ["--help"], ["skills"], ["kinds"], ["addon", "list"], ["addon", "all", "--print"], ["doctor"], ["status", "--json"]]) good(run(root, args));
  assert.equal(json(good(run(root, ["status", "--json"]))).length, 0);
  for (const args of [["bogus"], ["constructor"], ["next"], ["new", "X", "--kind", "bad"], ["new", "X", "--lane", "bad"], ["new", "X", "--kind"], ["status", "--unknown"], ["status", "--json=false"]]) assert.notEqual(run(root, args).code, 0, args.join(" "));
});

test("installer covers every harness, preserves user instructions and is repeatable", (t) => {
  const root = project(t);
  put(root, "AGENTS.md", "# User rules\nKeep this text.\n");
  good(run(root, ["init", "--harness", "all"]));
  for (const h of Object.values(HARNESSES)) {
    assert.equal(readdirSync(join(root, h.skillsDir)).length, 20);
    assert.ok(get(root, h.instructions).includes("arsdlc:start"));
    if (h.commandsDir) assert.equal(readdirSync(join(root, h.commandsDir)).length, 20);
    if (h.agentsDir) assert.equal(readdirSync(join(root, h.agentsDir)).length, 2);
  }
  const first = get(root, "AGENTS.md");
  good(run(root, ["init", "--harness", "all"]));
  assert.equal(get(root, "AGENTS.md"), first);
  assert.ok(first.includes("Keep this text."));
  assert.ok(!good(run(root, ["doctor"])).out.includes("=>"), "doctor prints a status, never function source");
});

test("link installation works and unknown harnesses do not write", (t) => {
  const root = project(t);
  assert.notEqual(run(root, ["init", "--harness", "missing"]).code, 0);
  assert.equal(existsSync(join(root, "arsdlc.json")), false);
  good(run(root, ["init", "--harness", "universal", "--link"]));
  assert.ok(lstatSync(join(root, ".agents/skills/arsdlc-flow")).isSymbolicLink());
});

test("feature scaffold, state, trace, validators and skipped gates agree", (t) => {
  const root = project(t);
  newFeature(root);
  const state = json(good(run(root, ["next", "export", "--json"])));
  assert.equal(state.state, "SPECIFY");
  assert.equal(state.feature, "export");
  assert.equal(state.gates.G1.skipped, true);
  assert.notEqual(run(root, ["check", "spec", "export"]).code, 0);
  assert.equal(run(root, ["gate", "G3", "export", "--json"]).code, 2);
  good(run(root, ["gate", "G1", "export", "--json"]));
  put(root, dir + "spec.md", spec);
  good(run(root, ["check", "spec", "export"]));
  put(root, dir + "tasks.md", "- [ ] T1 [R:Export] export records\n");
  good(run(root, ["trace", "export", "--json"]));
  put(root, dir + "tasks.md", "- [ ] T1 [R:Ghost] wrong\n");
  assert.equal(run(root, ["trace", "export", "--json"]).code, 2);
  assert.equal(json(good(run(root, ["status", "--json"])))[0].slug, "export");
  assert.notEqual(run(root, ["new", "Export"]).code, 0);
});

test("path components and missing option values are rejected before writes or execution", (t) => {
  const root = project(t);
  for (const slug of ["../escape", "..", "nested/name", "nested\\name", "a.json", "C:\\outside"]) assert.notEqual(run(root, ["new", "X", "--slug", slug]).code, 0);
  newFeature(root);
  for (const label of ["../../escape", "nested\\name", "x.json"]) assert.notEqual(run(root, ["evidence", "export", "--label", label, "--", process.execPath, "-e", "console.log('never')"]).code, 0);
  assert.notEqual(run(root, ["evidence", "export", "--task", "../escape", "--", process.execPath, "-e", "0"]).code, 0);
  assert.equal(readdirSync(join(root, dir, "evidence")).length, 0);
});

test("evidence preserves argv, checksums source, and detects uncommitted changes", (t) => {
  const root = project(t);
  prepare(root);
  good(record(root, "console.log('space and = signs remain intact')"));
  const name = evidenceFile(root), rec = JSON.parse(get(root, dir + "evidence/" + name));
  assert.equal(rec.exitCode, 0);
  assert.ok(rec.outputTail.includes("space and = signs"));
  assert.equal(rec.argv.at(-1), "console.log('space and = signs remain intact')");
  assert.match(rec.recordSha256, /^[a-f0-9]{64}$/);
  good(run(root, ["gate", "G3", "export", "--json"]));
  good(run(root, ["audit", "export"]));
  put(root, "src.js", "export const value = 2;\n");
  assert.equal(run(root, ["gate", "G3", "export", "--json"]).code, 2);
  assert.equal(run(root, ["report", "export", "--json"]).code, 3);
  good(record(root));
  accept(root);
  assert.equal(json(good(run(root, ["next", "export", "--json"]))).state, "DONE");
  good(run(root, ["gates", "export"]));
});

test("nonzero, missing executable and changed-during-run evidence never fake green", (t) => {
  const root = project(t);
  prepare(root);
  assert.equal(record(root, "process.exit(7)").code, 3);
  assert.equal(run(root, ["evidence", "export", "--", "arsdlc-no-such-executable"]).code, 3);
  good(record(root, "require('node:fs').writeFileSync('src.js', 'changed during run')"));
  const rec = JSON.parse(get(root, dir + "evidence/" + evidenceFile(root)));
  assert.equal(rec.sourceChangedDuringRun, true);
  assert.equal(run(root, ["gate", "G3", "export", "--json"]).code, 2);
});

test("tampered and legacy evidence fail gate and audit", (t) => {
  const root = project(t);
  prepare(root);
  good(record(root));
  const path = dir + "evidence/" + evidenceFile(root), rec = JSON.parse(get(root, path));
  rec.exitCode = 42;
  put(root, path, rec);
  assert.equal(run(root, ["gate", "G3", "export", "--json"]).code, 2);
  assert.equal(run(root, ["audit", "export"]).code, 2);
  delete rec.recordSha256;
  rec.exitCode = 0;
  put(root, path, rec);
  assert.equal(run(root, ["gate", "G3", "export", "--json"]).code, 2);
});

test("approval CLI enforces author separation, agent refusal, intact chain and intent hashes", (t) => {
  const root = project(t);
  prepare(root, "regulated");
  for (const args of [["approve", "G1", "export", "--by", " Fixture Author "], ["approve", "G1", "export", "--by", "Fixture Author", "--force"], ["approve", "G1", "export", "--by", "unknown"]]) assert.notEqual(run(root, args).code, 0);
  assert.notEqual(run(root, ["approve", "G1", "export", "--by", "Fixture Reviewer"], { AISDLC_AGENT: "1" }).code, 0);
  for (const by of ["Fixture Reviewer", " fixture reviewer "]) good(run(root, ["approve", "G1", "export", "--by", by, "--note=reason=with equals"]));
  assert.equal(run(root, ["gate", "G1", "export", "--json"]).code, 2);
  good(run(root, ["approve", "G1", "export", "--by", "Second Reviewer"]));
  good(run(root, ["gate", "G1", "export", "--json"]));
  good(run(root, ["audit", "export"]));
  put(root, dir + "spec.md", spec + "\nChanged intent.\n");
  assert.equal(run(root, ["gate", "G1", "export", "--json"]).code, 2);
  const approvals = JSON.parse(get(root, dir + "approvals.json"));
  assert.equal(approvals[0].note, "reason=with equals");
  approvals[0].by = "Tampered Reviewer";
  put(root, dir + "approvals.json", approvals);
  assert.equal(run(root, ["audit", "export"]).code, 2);
  assert.notEqual(run(root, ["approve", "G1", "export", "--by", "Third Reviewer"]).code, 0);
});

test("lane ratchets up and agent cannot use forced downgrade", (t) => {
  const root = project(t);
  newFeature(root);
  good(run(root, ["lane", "export"]));
  good(run(root, ["lane", "export", "regulated"]));
  assert.notEqual(run(root, ["lane", "export", "quick"]).code, 0);
  assert.notEqual(run(root, ["lane", "export", "quick", "--force", "--note", "fixture"], { AISDLC_AGENT: "1" }).code, 0);
  good(run(root, ["lane", "export", "quick", "--force", "--note", "fixture-only exercise"]));
  assert.equal(JSON.parse(get(root, dir + "feature.json")).laneHistory.length, 2);
});

test("JSON and configuration corruption fail closed", (t) => {
  const root = project(t);
  newFeature(root);
  for (const value of ["{ broken", "null", "[]", JSON.stringify({ featuresDir: "../escape" }), JSON.stringify({ docsDir: "C:\\escape" }), JSON.stringify({ policy: { minApprovals: { G1: 0 } } }), JSON.stringify({ test: { gate: "unknown" } }), JSON.stringify({ test: { gate: "none-by-design" } })]) {
    put(root, "arsdlc.json", value);
    assert.notEqual(run(root, ["next", "export", "--json"]).code, 0, value);
  }
  put(root, "arsdlc.json", {});
  put(root, dir + "approvals.json", "{broken");
  assert.notEqual(run(root, ["next", "export", "--json"]).code, 0);
});

test("delta validator chooses latest numeric D number", (t) => {
  const root = project(t);
  newFeature(root);
  put(root, dir + "deltas/D2-old.md", "invalid");
  put(root, dir + "deltas/D10-new.md", "# Delta D10: change\n## Trigger\nrequest\n## Change\n| Requirement | Before | After | Type |\n|---|---|---|---|\n| Export | - | WHEN asked THE SYSTEM SHALL export | add |\n## Impact\nT1\n## Decision\nApproved-by: Fixture Reviewer\n");
  assert.ok(good(run(root, ["check", "delta", "export"])).out.includes("D10-new.md"));
});

test("secrets scan returns nonzero JSON and evidence redacts recognized output secrets", (t) => {
  const root = project(t);
  prepare(root);
  const key = "AKIA" + "ABCDEFGHIJKLMNOP";
  good(record(root, "console.log('AKIA' + 'ABCDEFGHIJKLMNOP')"));
  assert.ok(get(root, dir + "evidence/" + evidenceFile(root)).includes("redacted"));
  put(root, "secret.txt", key);
  const result = run(root, ["scan", "--json"]);
  assert.equal(result.code, 2);
  assert.ok(json(result).some((f) => f.family === "AWS access key"));
});

test("filesystem helpers support CRLF, preserve marked blocks, and protect sources", (t) => {
  const root = project(t, { git: false });
  put(root, "skills/arsdlc-demo/SKILL.md", "---\r\nname: arsdlc-demo\r\ndescription: Test description\r\n---\r\nBody");
  assert.equal(listSkills(join(root, "skills"))[0].description, "Test description");
  const file = join(root, "instructions.md");
  put(root, "instructions.md", "User text\n");
  upsertBlock(file, "START body END", "START", "END");
  upsertBlock(file, "START updated END", "START", "END");
  assert.ok(get(root, "instructions.md").startsWith("User text"));
  assert.equal(get(root, "instructions.md").split("START").length, 2);
  copyOrLink(join(root, "skills"), join(root, "skills"), false);
  assert.ok(existsSync(join(root, "skills/arsdlc-demo/SKILL.md")));
  assert.throws(() => copyOrLink(join(root, "skills"), join(root, "skills/nested"), false));
  assert.deepEqual(readJson(join(root, "missing.json"), []), []);
  put(root, "bad.json", "broken");
  assert.throws(() => readJson(join(root, "bad.json"), []));
  put(root, "arsdlc.json", {});
  mkdirSync(join(root, "nested"));
  assert.equal(projectRoot(join(root, "nested")), root);
});

test("source fingerprints include code and Markdown, not process artifacts or generated dependencies", (t) => {
  const root = project(t, { git: false });
  put(root, "src.js", "before");
  const before = sourceFingerprint(root);
  put(root, "README.md", "documentation");
  const withDocs = sourceFingerprint(root);
  assert.notEqual(withDocs, before);
  put(root, "docs/features/export/evidence/record.json", "evidence");
  put(root, "node_modules/example.js", "generated");
  assert.equal(sourceFingerprint(root), withDocs);
  put(root, "src.js", "after");
  assert.notEqual(sourceFingerprint(root), before);
});

test("approvals bind to the signed commit and a code change after signing invalidates them", (t) => {
  const root = project(t);
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  const spec = "# Spec: Export\n\n## 3. Requirements (EARS)\n### Requirement: Primary Flow\nWHEN a client runs the command THE SYSTEM SHALL write a file.\n#### Scenario: happy\n- GIVEN a project\n- WHEN the command runs\n- THEN the file exists\n## 5. Acceptance bar\nApproved-by: ______  Date: ______\n## 9. Value sourcing\n| Value | Source | How obtained |\n|---|---|---|\n| file path | Primary Flow | returned by the writer |\n";
  good(run(root, ["init", "--harness", "universal"]));
  newFeature(root, "standard");
  put(root, dir + "spec.md", spec);
  put(root, dir + "plan.md", "# Plan: Export\n\n## Architecture\nGateway -> Service -> Store, described here at a length that clears the stub floor.\n\n## Traceability\n| Requirement | Tasks |\n|---|---|\n| Primary Flow | T1 |\n");
  git("add", "-A");
  git("commit", "-qm", "fixture: plan ready for approval");
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

  good(run(root, ["approve", "G1", "export", "--by", "Priya"]));
  const entry = JSON.parse(get(root, dir + "approvals.json"))[0];
  assert.equal(entry.head, head, "the approval records the commit it was signed on");
  assert.equal(entry.git, "bound");
  assert.match(entry.tree, /^[0-9a-f]{40,64}$/);
  assert.equal(run(root, ["gate", "G1", "export"]).code, 0);
  good(run(root, ["ci", "export"]));

  put(root, "src/export.js", "export const x = 1;\n");
  const moved = run(root, ["gate", "G1", "export"]);
  assert.notEqual(moved.code, 0, "code that moved after the signature must fail the gate");
  assert.match(moved.out + moved.err, /commits after signing/);
  assert.match(moved.out + moved.err, /src\/export\.js/);
  const ciMoved = run(root, ["ci", "export"]);
  assert.notEqual(ciMoved.code, 0, "CI must not merge behind a signature the diff invalidated");
  assert.match(ciMoved.out, /G1 approval/);

  rmSync(join(root, "src/export.js"), { force: true });
  rmSync(join(root, "src"), { recursive: true, force: true });
  put(root, dir + "tasks.md", "# Tasks: Export\n\n- [ ] T1 [R:Primary Flow] cut the thinnest slice through the seam\n");
  assert.equal(run(root, ["gate", "G1", "export"]).code, 0, "feature artifacts are expected to move; the hash check owns those");
  good(run(root, ["ci", "export"]));

  // Drift is judged by content against the signed tree, not by commit count: what matters is that
  // source differs from what the human signed.
  put(root, "src/util.js", "export const y = 2;\n");
  git("add", "-A");
  git("commit", "-qm", "fixture: source change lands after signing");
  const committed = run(root, ["gate", "G1", "export"]);
  assert.notEqual(committed.code, 0, "a committed source change after signing is stale, not just a dirty tree");
  assert.match(committed.out + committed.err, /src\/util\.js/);
});

test("a no-git project records an unavailable binding instead of inventing one", (t) => {
  const root = project(t, { git: false });
  good(run(root, ["init", "--harness", "universal"]));
  newFeature(root, "standard");
  put(root, dir + "plan.md", "# Plan: Export\n\n## Architecture\nGateway -> Service -> Store, described here at a length that clears the stub floor.\n\n## Traceability\n| Requirement | Tasks |\n|---|---|\n| Primary Flow | T1 |\n");
  good(run(root, ["approve", "G1", "export", "--by", "Priya"]));
  const entry = JSON.parse(get(root, dir + "approvals.json"))[0];
  assert.equal(entry.git, "unavailable");
  assert.equal(entry.head, null);
  assert.equal(entry.tree, null);
  const gate = run(root, ["gate", "G1", "export"]);
  assert.equal(gate.code, 0, gate.out + gate.err);
  assert.match(gate.out + gate.err, /on current plan hash/);
});

test("doctor reports the enforcement level it can point at, never a capability", (t) => {
  const root = project(t, { git: false });
  good(run(root, ["init", "--harness", "claude-code"]));
  const bare = json(run(root, ["doctor", "--json"]));
  const levels = Object.fromEntries(bare.enforcement.map((e) => [e.id, e.enforcement]));
  assert.equal(levels["claude-code"], "none", "a skills install alone is not enforcement");
  assert.equal(levels["codex"], "none");
  assert.ok(bare.enforcement.every((e) => e.reason && e.install), "every level carries a reason and a command");

  put(root, ".github/workflows/gates.yml", "name: arsdlc gate\n");
  const withCi = json(run(root, ["doctor", "--json"]));
  assert.equal(Object.fromEntries(withCi.enforcement.map((e) => [e.id, e.enforcement]))["codex"], "ci");

  put(root, "hooks/arsdlc-guard.mjs", "export default {};\n");
  put(root, "hooks/hooks.json", '{"modules":[]}\n');
  const withGuard = json(run(root, ["doctor", "--json"]));
  const guardLevels = Object.fromEntries(withGuard.enforcement.map((e) => [e.id, e.enforcement]));
  assert.equal(guardLevels["claude-code"], "native", "a guard module in the project is what native means");
  assert.equal(guardLevels["cursor"], "ci", "other harnesses stay ci until an adapter is verified");
  const human = run(root, ["doctor"]);
  assert.match(human.out, /enforcement: native = a guard module/);
});
