import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, readlinkSync, symlinkSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { commandInvocation, copyOrLink, sourceFingerprint } from "../src/fsx.js";
import { runGate, reviewerNotes, approvedBy, scanSecrets } from "../src/engine.js";
const cli = fileURLToPath(new URL("../bin/aisdlc.js", import.meta.url));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "aisdlc-edge-"));
  t.after(() => { assert.equal(dirname(root), resolve(tmpdir())); rmSync(root, { recursive: true, force: true }); });
  return root;
}
function put(root, name, text) { const path = join(root, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }
function invoke(root, args) { return spawnSync(process.execPath, [cli, "--cwd", root, ...args], { encoding: "utf8", env: { ...process.env, AISDLC_AGENT: "" } }); }

test("Windows shim resolution preserves literal shell operators, quotes, spaces and percent signs", (t) => {
  const root = fixture(t);
  const script = "node_modules/npm/bin/npm-cli.js";
  put(root, script, "console.log(JSON.stringify(process.argv.slice(2)))");
  const args = ["npm", "a b", "&", "|", "%PATH%", 'a"b'];
  const invocation = commandInvocation(args, { platform: "win32", pathDirs: [root] });
  assert.equal(invocation[0], process.execPath);
  const result = spawnSync(invocation[0], invocation.slice(1), { encoding: "utf8", shell: false });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), args.slice(1));
  assert.throws(() => commandInvocation(["unknown.cmd"], { platform: "win32", pathDirs: [root] }));
});

test("physical installer aliases cannot delete source, extra user files survive updates", (t) => {
  const root = fixture(t);
  put(root, "real/skill/SKILL.md", "source");
  symlinkSync(join(root, "real"), join(root, "alias"), process.platform === "win32" ? "junction" : "dir");
  copyOrLink(join(root, "real/skill"), join(root, "alias/skill"), false);
  assert.equal(readFileSync(join(root, "real/skill/SKILL.md"), "utf8"), "source");
  put(root, "installed/custom.md", "keep this");
  copyOrLink(join(root, "real/skill"), join(root, "installed"), false);
  assert.equal(readFileSync(join(root, "installed/custom.md"), "utf8"), "keep this");
  assert.throws(() => copyOrLink(join(root, "real/skill"), join(root, "installed"), true));
});

test("link mode prefers real symlinks and falls back to junctions only when Windows refuses", (t) => {
  const root = fixture(t);
  put(root, "src/SKILL.md", "source");
  const attempt = (name, refuseSymlink) => {
    const target = join(root, name);
    const calls = [];
    const symlink = (from, to, kind) => {
      calls.push(kind);
      if (kind === "dir" && refuseSymlink) { const error = new Error("operation not permitted"); error.code = "EPERM"; throw error; }
      symlinkSync(from, to, kind);
    };
    const mode = copyOrLink(join(root, "src"), target, true, { platform: "win32", symlink });
    return { mode, calls, target };
  };
  const linked = attempt("with-symlink", false);
  assert.equal(linked.mode, "symlink");
  assert.deepEqual(linked.calls, ["dir"]);
  assert.equal(readlinkSync(linked.target), join("src"));
  assert.equal(readFileSync(join(linked.target, "SKILL.md"), "utf8"), "source");
  const fallback = attempt("with-junction", true);
  assert.equal(fallback.mode, "junction");
  assert.deepEqual(fallback.calls, ["dir", "junction"]);
  assert.equal(readFileSync(join(fallback.target, "SKILL.md"), "utf8"), "source");
  const other = new Error("no space left on device");
  other.code = "ENOSPC";
  assert.throws(() => copyOrLink(join(root, "src"), join(root, "never"), true, { platform: "win32", symlink: () => { throw other; } }), /ENOSPC|no space/);
  assert.equal(copyOrLink(join(root, "src"), join(root, "copied"), false, { platform: "win32" }), "copy");
});

test("invalid config is rejected before installer side effects", (t) => {
  const root = fixture(t);
  put(root, "aisdlc.json", "{broken");
  put(root, "AGENTS.md", "user instructions");
  const result = invoke(root, ["init", "--harness", "all"]);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), "user instructions");
  assert.deepEqual(readdirSync(root).sort(), ["AGENTS.md", "aisdlc.json"]);
});

test("valid legacy history cannot prove a gate but a new recorded run recovers it", (t) => {
  const root = fixture(t);
  assert.equal(invoke(root, ["new", "Probe", "--lane", "spike"]).status, 0);
  const prefix = "docs/features/probe/";
  put(root, prefix + "spec.md", "# Spec\n### Requirement: Probe\nWHEN asked THE SYSTEM SHALL answer.\n#### Scenario: Run\n- THEN an answer exists\n");
  put(root, prefix + "tasks.md", "");
  put(root, prefix + "evidence/legacy-full.json", JSON.stringify({ label: "full", command: "node -e 0", exitCode: 0, startedAt: "2020-01-01T00:00:00Z", outputSha256: "a".repeat(64) }));
  assert.equal(invoke(root, ["gate", "G3", "probe", "--json"]).status, 2);
  const result = invoke(root, ["evidence", "probe", "--label", "spike", "--", process.execPath, "-e", "console.log('probe')"]);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const gate = invoke(root, ["gate", "G3", "probe", "--json"]);
  assert.equal(gate.status, 0, gate.stderr + gate.stdout);
  assert.equal(readdirSync(join(root, prefix, "evidence")).length, 2, "history is preserved");
});

test("blank model fields cannot consume another field and multispace names preserve SoD", () => {
  assert.equal(reviewerNotes("Author model: gpt\nReviewer model:\nCross-model: independent").reviewer, "");
  assert.equal(reviewerNotes("Author model:\nReviewer model: gemini").author, "");
  assert.equal(approvedBy("Approved-by: Alice  Smith\n"), "Alice  Smith");
  const acceptance = "| ID | Evidence | Result |\n|---|---|---|\n| A1 | run.json | pass |\nAuthor model: gpt\nReviewer model: gemini\nApproved-by: Alice  Smith";
  assert.equal(runGate("G4", { author: "Alice Smith", acceptance, evidence: [{ file: "run.json", exitCode: 0 }] }).passed, false);
});

test("stale citations fail even when a current full run exists", () => {
  const acceptance = "| ID | Evidence | Result |\n|---|---|---|\n| A1 | old.json | pass |\nAuthor model: gpt\nReviewer model: gemini\nApproved-by: Reviewer";
  assert.equal(runGate("G4", { acceptance, sourceSha256: "new", evidence: [{ file: "old.json", exitCode: 0, sourceSha256: "old" }, { file: "new.json", label: "full", exitCode: 0, sourceSha256: "new" }] }).passed, false);
});

test("common credential flags are caught before plaintext argv recording", () => {
  for (const text of ["--pass" + "word actual-value", "--api-" + "key=actual-value", "--access-" + "token actual-value"]) assert.ok(scanSecrets(text).some((f) => f.family === "Credential command argument"));
  assert.equal(scanSecrets("--password <your-password>").length, 0);
});

test("no-Git fingerprint includes deeply nested source and Markdown output", (t) => {
  const root = fixture(t);
  const before = sourceFingerprint(root);
  put(root, "a/b/c/d/e/f/g/h/i/j/k/source.js", "deep code");
  assert.notEqual(sourceFingerprint(root), before);
  const withCode = sourceFingerprint(root);
  put(root, "README.md", "changed docs output");
  assert.notEqual(sourceFingerprint(root), withCode);
});
