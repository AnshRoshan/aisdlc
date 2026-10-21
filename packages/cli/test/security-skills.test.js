import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ACCEPTANCE } from "../src/templates.js";
import { parseAcceptance } from "../src/engine.js";

const repo = new URL("../../../", import.meta.url);
const text = (path) => readFileSync(new URL(path, repo), "utf8").replace(/\r\n/g, "\n");
const protocol = text("skills/arsdlc-verify/references/security-verification.md");
const controls = [
  "SQL injection", "Cross-site scripting (XSS)", "CSRF protection", "Secure file uploads",
  "Broken Object-Level Authorization (BOLA)", "Rate limiting", "Secure JWT handling",
  "Secret management", "Server-side API keys", "Secure password hashing", "Multi-factor authentication (MFA)",
  "Secure cookie settings", "No auth tokens in local storage", "Server-side authorization",
  "Row-Level Security (RLS)", "Webhook signatures", "Server-Side Request Forgery (SSRF)",
  "Production source maps", "Default credentials", "Sensitive data in logs", "Vulnerable dependencies",
];

test("security protocol includes every requested control exactly once in its matrix", () => {
  const rows = [...protocol.matchAll(/^\| (S\d{2}) \| ([^|]+) \|/gm)];
  assert.equal(rows.length, 21);
  for (let i = 0; i < controls.length; i++) {
    assert.equal(rows[i][1], `S${String(i + 1).padStart(2, "0")}`);
    assert.equal(rows[i][2].trim(), controls[i]);
  }
});

test("verification, review, quality and release route to final security checks", () => {
  for (const name of ["verify", "review", "quality", "release"]) {
    const skill = text(`skills/arsdlc-${name}/SKILL.md`);
    assert.match(skill, /## Final security verification/);
    assert.match(skill, /security-review\.md/);
    assert.match(skill, /NOT_VERIFIED/);
  }
  const verify = text("skills/arsdlc-verify/SKILL.md");
  assert.match(verify, /read `references\/security-verification\.md` and follow it/);
  assert.ok(verify.indexOf("## Final security verification") < verify.indexOf("## Hand off"));
});

test("security reporting preserves evidence, applicability and trust boundaries", () => {
  for (const pattern of [
    /VERIFIED, FAILED, NOT_APPLICABLE or NOT_VERIFIED/,
    /NOT_APPLICABLE needs inspected architecture/,
    /FAILED or applicable NOT_VERIFIED blocks/,
    /--label security -- <command>/,
    /--label full/,
    /retain the\nred run/,
    /actual code\/config/,
    /not a new CLI gate/,
    /does not automatically assess this report/,
    /final security-verification section/,
  ]) assert.match(protocol, pattern);
});

test("provider comparison requires actual official evidence rather than certification claims", () => {
  for (const pattern of [/OWASP ASVS/, /OpenAI/, /Anthropic/, /AWS/, /Azure/, /Google Cloud/,
    /official URL\/access date/, /customer-controlled configuration/, /Never claim parity\/certification/]) assert.match(protocol, pattern);
});

test("acceptance security notes start unverified and do not add scenario-table rows", () => {
  const seed = ACCEPTANCE("Fixture");
  assert.match(seed, /Security review: <security-review\.md path or evidenced applicability reason>/);
  assert.match(seed, /Security readiness: NOT_VERIFIED/);
  assert.equal(parseAcceptance(seed).length, 1);
});

test("security reference fits the existing sub-file budget", () => {
  assert.ok(Buffer.byteLength(protocol) <= 9 * 1024, "prune the protocol instead of raising its budget");
});
