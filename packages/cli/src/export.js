/**
 * Portable evidence: an in-toto Statement v1 over the feature's recorded process, wrapped in a DSSE
 * envelope, plus SARIF findings and an offline verifier. Pure builders only - reading the repository,
 * writing the bundle and running an external signer belong to the CLI.
 *
 * What this proves: the exported records are internally consistent and were not edited afterwards.
 * What it never proves on its own: authorship. That requires a signature, which is optional and external.
 */

export const STATEMENT_TYPE = "https://in-toto.io/Statement/v1";
export const PREDICATE_TYPE = "https://arsdlc.dev/attestation/gate-evidence/v1";
export const PAYLOAD_TYPE = "application/vnd.in-toto+json";
export const ARTIFACTS = ["spec.md", "plan.md", "tasks.md", "acceptance.md", "rollout.md", "guardrails.yaml", "runbook.md"];

const canonical = (value) => JSON.stringify(value);

export function statementOf(snapshot) {
  return {
    _type: STATEMENT_TYPE,
    subject: snapshot.subjects,
    predicateType: PREDICATE_TYPE,
    predicate: snapshot.predicate,
  };
}

/** An unsigned DSSE envelope: the shape is real, the signatures array is honestly empty. */
export function dsseEnvelope(statement) {
  return {
    payloadType: PAYLOAD_TYPE,
    payload: Buffer.from(canonical(statement), "utf8").toString("base64"),
    signatures: [],
  };
}

/** SARIF 2.1.0: one run, gate rules, and a result per failing check or unsatisfied acceptance row. */
export function sarifOf({ toolVersion, gates, acceptanceRows, feature }) {
  const rules = [];
  const results = [];
  const addRule = (id, text) => {
    if (!rules.some((r) => r.id === id)) rules.push({ id, shortDescription: { text }, defaultConfiguration: { level: "error" } });
  };
  for (const g of gates || []) {
    for (const check of (g.checks || []).filter((c) => !c.ok)) {
      const id = `arsdlc/${g.gate.toLowerCase()}`;
      addRule(id, `${g.gate} ${g.title}`);
      results.push({
        ruleId: id,
        level: "error",
        message: { text: `${g.gate} ${g.title}: ${check.name}${check.detail ? ` - ${check.detail}` : ""}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: `docs/features/${feature}/`, uriBaseId: "%SRCROOT%" } } }],
      });
    }
  }
  for (const row of acceptanceRows || []) {
    if (/^(pass|passed|ok)$/i.test(row.result || "")) continue;
    const id = "arsdlc/acceptance";
    addRule(id, "Acceptance scenario not satisfied");
    results.push({
      ruleId: id,
      level: row.result === "pending" ? "warning" : "error",
      message: { text: `${row.id} ${row.requirement}/${row.scenario}: ${row.result || "unrecorded"}` },
      locations: [{ physicalLocation: { artifactLocation: { uri: `docs/features/${feature}/acceptance.md`, uriBaseId: "%SRCROOT%" } } }],
    });
  }
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{ tool: { driver: { name: "arsdlc", version: toolVersion, informationUri: "https://github.com/AnshRoshan/arsdlc", rules } }, results }],
  };
}

/**
 * Re-check a bundle against itself: the envelope payload must equal the statement, and every artifact
 * and evidence record digest listed in the statement must match the file shipped beside it.
 * Returns the list of mismatches; empty means the bundle is intact.
 */
export function verifyBundle({ statement, envelope, digests }) {
  const errors = [];
  if (!statement || typeof statement !== "object") return ["statement.json is missing or not an object"];
  if (statement._type !== STATEMENT_TYPE) errors.push(`statement._type is "${statement._type}", expected ${STATEMENT_TYPE}`);
  if (statement.predicateType !== PREDICATE_TYPE) errors.push(`predicateType is "${statement.predicateType}", expected ${PREDICATE_TYPE}`);
  if (!envelope || typeof envelope !== "object") return [...errors, "envelope.json is missing or not an object"];
  if (envelope.payloadType !== PAYLOAD_TYPE) errors.push(`envelope.payloadType is "${envelope.payloadType}", expected ${PAYLOAD_TYPE}`);
  let decoded = "";
  try { decoded = Buffer.from(envelope.payload || "", "base64").toString("utf8"); }
  catch { errors.push("envelope.payload is not valid base64"); }
  if (decoded && canonical(statement) !== decoded) errors.push("envelope.payload does not match statement.json");
  if (!Array.isArray(envelope.signatures)) errors.push("envelope.signatures is not an array");
  else if (!envelope.signatures.length) errors.push("unsigned: integrity only, not authorship");
  for (const subject of statement.subject || []) {
    const sha = subject.digest && subject.digest.sha256;
    const seen = digests.get(subject.name);
    if (!sha) { errors.push(`${subject.name}: statement lists no sha256 digest`); continue; }
    if (seen === undefined) { errors.push(`${subject.name}: listed in the statement but absent from the bundle`); continue; }
    if (seen !== sha) errors.push(`${subject.name}: digest mismatch (${short8(seen)} != ${short8(sha)})`);
  }
  for (const [name, sha] of digests) {
    if (!(statement.subject || []).some((s) => s.name === name)) errors.push(`${name}: present in the bundle but absent from the statement`);
    if (sha === null) errors.push(`${name}: cannot be read`);
  }
  return errors;
}

const short8 = (h) => String(h || "").slice(0, 8);
