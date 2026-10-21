import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { statementOf, dsseEnvelope, sarifOf, verifyBundle, STATEMENT_TYPE, PREDICATE_TYPE, PAYLOAD_TYPE } from "../src/export.js";

const cli = fileURLToPath(new URL("../bin/arsdlc.js", import.meta.url));
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const hard = (errors) => errors.filter((e) => !e.startsWith("unsigned:"));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "arsdlc-export-"));
  t.after(() => { assert.ok(resolve(root).startsWith(resolve(tmpdir()))); rmSync(root, { recursive: true, force: true }); });
  return root;
}
function run(root, args) {
  const r = spawnSync(process.execPath, [cli, "--cwd", root, ...args], { encoding: "utf8", env: { ...process.env, AISDLC_AGENT: "" }, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(r.error, undefined);
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function scaffold(root) {
  const r = run(root, ["init", "--harness", "universal"]);
  assert.equal(r.code, 0, r.out + r.err);
  const n = run(root, ["new", "Export", "--kind", "lib", "--lane", "quick", "--author", "Agent"]);
  assert.equal(n.code, 0, n.out + n.err);
}

test("statement and envelope follow in-toto v1 and DSSE exactly", () => {
  const statement = statementOf({ subjects: [{ name: "arsdlc:bundle/artifacts/spec.md", digest: { sha256: sha256("spec") } }], predicate: { feature: { slug: "x" } } });
  assert.equal(statement._type, STATEMENT_TYPE);
  assert.equal(statement.predicateType, PREDICATE_TYPE);
  const envelope = dsseEnvelope(statement);
  assert.equal(envelope.payloadType, PAYLOAD_TYPE);
  assert.deepEqual(envelope.signatures, [], "an unsigned envelope says so instead of pretending");
  assert.equal(Buffer.from(envelope.payload, "base64").toString("utf8"), JSON.stringify(statement));

  const digests = new Map([["arsdlc:bundle/artifacts/spec.md", sha256("spec")]]);
  assert.deepEqual(hard(verifyBundle({ statement, envelope, digests })), []);
  assert.match(verifyBundle({ statement, envelope, digests }).join(" "), /unsigned: integrity only, not authorship/);
});

test("verifier names a tampered file, a hidden file and an invented file", () => {
  const statement = statementOf({ subjects: [{ name: "arsdlc:bundle/artifacts/spec.md", digest: { sha256: sha256("spec") } }], predicate: {} });
  const envelope = dsseEnvelope(statement);

  const edited = hard(verifyBundle({ statement, envelope, digests: new Map([["arsdlc:bundle/artifacts/spec.md", sha256("edited")]]) }));
  assert.equal(edited.length, 1);
  assert.match(edited[0], /spec\.md: digest mismatch/);
  assert.ok(edited[0].includes(sha256("edited").slice(0, 8)) && edited[0].includes(sha256("spec").slice(0, 8)), "both digests are printed");

  const hidden = hard(verifyBundle({ statement, envelope, digests: new Map() }));
  assert.match(hidden.join(" "), /listed in the statement but absent from the bundle/);

  const invented = hard(verifyBundle({ statement, envelope, digests: new Map([["arsdlc:bundle/artifacts/extra.md", sha256("x")]]) }));
  assert.match(invented.join(" "), /present in the bundle but absent from the statement/);

  const rewroteStatement = { ...statement, subject: [{ name: "arsdlc:bundle/artifacts/spec.md", digest: { sha256: sha256("edited") } }] };
  assert.match(hard(verifyBundle({ statement: rewroteStatement, envelope, digests: new Map([["arsdlc:bundle/artifacts/spec.md", sha256("edited")]]) })).join(" "),
    /envelope\.payload does not match statement\.json/, "re-signing the statement without the envelope is caught");
});

test("sarif 2.1.0 carries one result per failing check and unsatisfied row", () => {
  const sarif = sarifOf({
    toolVersion: "0.2.1",
    feature: "export",
    gates: [{ gate: "G4", title: "Acceptance proof", checks: [{ name: "human sign-off (SoD)", ok: false, detail: "unsigned" }, { name: "spec exists", ok: true }] }],
    acceptanceRows: [{ id: "A1", requirement: "Primary Flow", scenario: "happy", result: "pending" }, { id: "A2", requirement: "Primary Flow", scenario: "edge", result: "pass" }],
  });
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs.length, 1);
  assert.equal(sarif.runs[0].tool.driver.name, "arsdlc");
  assert.deepEqual(sarif.runs[0].tool.driver.rules.map((r) => r.id), ["arsdlc/g4", "arsdlc/acceptance"]);
  assert.equal(sarif.runs[0].results.length, 2, "the passing row is not reported");
  assert.equal(sarif.runs[0].results[0].message.text, "G4 Acceptance proof: human sign-off (SoD) - unsigned");
  assert.equal(sarif.runs[0].results[1].level, "warning");
  for (const r of sarif.runs[0].results) assert.ok(r.locations[0].physicalLocation.artifactLocation.uri.startsWith("docs/features/export/"));
});

test("export writes a bundle that verifies, and tampering with a copy fails offline", (t) => {
  const root = fixture(t);
  scaffold(root);
  const out = join(root, ".tmp", "bundle");
  const exported = run(root, ["export", "export", "--out", ".tmp/bundle"]);
  assert.equal(exported.code, 0, exported.out + exported.err);
  for (const f of ["statement.json", "envelope.json", "findings.sarif", "verify.md"]) assert.ok(readdirSync(out).includes(f), f);
  assert.ok(readdirSync(join(out, "artifacts")).includes("spec.md"));

  const statement = JSON.parse(readFileSync(join(out, "statement.json"), "utf8"));
  assert.equal(statement.subject.length, new Set(statement.subject.map((s) => s.name)).size, "no duplicate subjects");
  assert.ok(statement.predicate.limits.some((l) => /do not prove who wrote/i.test(l) || /not prove authorship/i.test(l)), "the bundle states its own limit");

  const clean = run(root, ["export", "--verify", ".tmp/bundle"]);
  assert.equal(clean.code, 0, clean.out + clean.err);
  assert.match(clean.out, /bundle verified/);

  const target = join(out, "artifacts", "spec.md");
  writeFileSync(target, readFileSync(target, "utf8") + "\nquiet edit after export\n");
  const tampered = run(root, ["export", "--verify", ".tmp/bundle"]);
  assert.equal(tampered.code, 1);
  assert.match(tampered.out + tampered.err, /artifacts\/spec\.md: digest mismatch/);
});

test("a signer adapter records a signature and the verifier stops calling it unsigned", (t) => {
  const root = fixture(t);
  scaffold(root);
  const signer = join(root, "sign.mjs");
  writeFileSync(signer, "import{readFileSync,writeFileSync}from'node:fs';const p=process.argv[2];const e=JSON.parse(readFileSync(p,'utf8'));e.signatures=[{sig:'fixture',keyid:'fixture-key'}];writeFileSync(p,JSON.stringify(e,null,2)+'\\n');\n");
  const quoted = `node "${signer}" {envelope}`;
  const exported = run(root, ["export", "export", "--out", ".tmp/signed", "--sign", quoted]);
  assert.equal(exported.code, 0, exported.out + exported.err);
  assert.match(exported.out, /signed by node/);
  const envelope = JSON.parse(readFileSync(join(root, ".tmp/signed", "envelope.json"), "utf8"));
  assert.equal(envelope.signatures.length, 1);

  const verified = run(root, ["export", "--verify", ".tmp/signed"]);
  assert.equal(verified.code, 0, verified.out + verified.err);
  assert.match(verified.out + verified.err, /signature/i);
  assert.doesNotMatch(verified.out + verified.err, /unsigned: integrity only/);

  const broken = run(root, ["export", "export", "--out", ".tmp/nosign", "--sign", "node missing-signer.mjs {envelope}"]);
  assert.equal(broken.code, 0, "a failed signer degrades instead of failing the export");
  assert.match(broken.out + broken.err, /signing skipped/);
});
