/**
 * aisdlc engine: pure functions. Same inputs ⇒ same state.
 * Invariant #6: disk is state, chat is not. Nothing here touches the filesystem.
 */
import { createHash } from "node:crypto";

export const GATES = ["G1", "G2", "G3", "G4", "G5", "G6"];
export const GATE_TITLES = {
  G1: "Plan approval",
  G2: "Artifact consistency",
  G3: "Merge safety",
  G4: "Acceptance proof",
  G5: "Release approval",
  G6: "Runtime guardrails",
};

export const KINDS = ["frontend", "backend", "mobile", "data", "ml", "infra", "docs", "lib", "other"];
export const KIND_HINTS = {
  frontend: "component tests + visual diff + a11y audit",
  backend: "integration tests + preview smoke test",
  mobile: "emulator run + store checklist",
  data: "invariant tests + backfill parity check",
  ml: "eval cases are tests + threshold gate",
  infra: "plan/dry-run + policy check + expand/contract",
  docs: "lint + linkcheck + human review",
  lib: "API contract tests + semver + back-compat",
  other: "the domain's cheapest falsifier",
};

/* ───────────── Lanes: how much process a feature carries ───────────── */
export const LANES = ["spike", "quick", "standard", "regulated"];
export const LANE_GATES = {
  spike: ["G3"],
  quick: ["G2", "G3", "G4"],
  standard: ["G1", "G2", "G3", "G4", "G5", "G6"],
  regulated: ["G1", "G2", "G3", "G4", "G5", "G6"],
};
export const LANE_HINTS = {
  spike: "feasibility question; output is an answer, code is throwaway; evidence of the probe is the only gate",
  quick: "bounded change to an existing flow or a bug fix; spec + tasks (G2), evidence (G3), human acceptance (G4)",
  standard: "new capability; all six gates",
  regulated: "money, PII, auth, irreversible data, public contracts; all six gates, two approvers",
};
export const LANE_MIN_APPROVALS = { spike: 1, quick: 1, standard: 1, regulated: 2 };
export const normalizeLane = (l) => (LANES.includes(l) ? l : "standard");
export const laneRequires = (lane, gate) => LANE_GATES[normalizeLane(lane)].includes(gate);
export const specSignatureRequired = (lane) => normalizeLane(lane) !== "spike";

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const short = (h) => (h || "").slice(0, 12);

/* ───────────── Approved-by (lookahead terminator so "Date:" never becomes a name) ───────────── */
export function approvedBy(text) {
  const m = (text || "").match(/Approved-by:\s*(.*?)(?=\s{2,}|\s*Date:|$)/m);
  if (!m) return null;
  const v = m[1].trim();
  if (!v || /^[_\-\s]+$/.test(v) || /^\[?\s*\]?$/.test(v)) return null;
  return v;
}

/* ───────────── EARS spec validation ───────────── */
export function splitReqBlocks(text) {
  const re = /^###\s+Requirement:\s*(.+)$/gm;
  const idx = [];
  let m;
  while ((m = re.exec(text))) idx.push({ name: m[1].trim(), start: m.index, bodyStart: m.index + m[0].length });
  return idx.map((h, i) => {
    let end = i + 1 < idx.length ? idx[i + 1].start : text.length;
    const nextH2 = text.slice(h.bodyStart).search(/^##\s+(?!#)/m);
    if (nextH2 >= 0 && h.bodyStart + nextH2 < end) end = h.bodyStart + nextH2;
    const body = text.slice(h.bodyStart, end);
    return {
      name: h.name,
      body,
      scenarios: (body.match(/^####\s+Scenario:/gm) || []).length,
      hasShall: /\b(SHALL|MUST)\b/.test(body),
    };
  });
}

export function validateSpec(text) {
  const errors = [];
  const warnings = [];
  text = text || "";
  const reqs = splitReqBlocks(text);
  if (reqs.length === 0) errors.push("No `### Requirement:` blocks found (EARS requires at least one).");
  const seen = new Set();
  for (const r of reqs) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) errors.push(`Duplicate requirement name "${r.name}".`);
    seen.add(key);
    if (!r.hasShall) errors.push(`Requirement "${r.name}" has no SHALL/MUST statement.`);
    if (r.scenarios === 0) errors.push(`Requirement "${r.name}" has no \`#### Scenario:\` block.`);
  }
  const clar = (text.match(/\[NEEDS CLARIFICATION[^\]]*\]/g) || []).length;
  if (clar) errors.push(`${clar} [NEEDS CLARIFICATION] marker(s) remain.`);
  const signedBy = approvedBy(text);
  if (!signedBy) warnings.push("§5 Approved-by is unsigned (humans own the acceptance bar).");
  const sec6 = text.split(/^##\s+6\b.*$/m)[1];
  if (sec6) {
    const rows = sec6.split(/^##\s+/m)[0].split("\n").filter((l) => /^\|/.test(l) && !/^\|\s*-/.test(l));
    const open = rows.slice(1).filter((r) => {
      const cells = r.split("|").map((c) => c.trim()).filter(Boolean);
      const last = (cells[cells.length - 1] || "").toLowerCase();
      return !/^(done|resolved|closed|n\/?a|-)$/.test(last);
    });
    if (open.length) warnings.push(`${open.length} open question row(s) in §6.`);
  }
  return { errors, warnings, requirements: reqs, signedBy };
}

/* ───────────── Tasks ───────────── */
/** `- [ ] T3 [R:Name, R:Other] title {est: 2h}` */
export function parseTasks(text) {
  const out = [];
  const re = /^-\s*\[( |x|X)\]\s*T(\d+)\s*(?:\[R:\s*([^\]]*)\])?\s*(.*)$/gm;
  let m;
  while ((m = re.exec(text || ""))) {
    out.push({
      num: Number(m[2]),
      done: m[1].toLowerCase() === "x",
      reqRefs: (m[3] || "").split(",").map((s) => s.trim().replace(/^R:\s*/i, "").trim()).filter(Boolean),
      title: m[4].trim(),
    });
  }
  return out;
}

export function traceMatrix(specText, tasks) {
  const reqs = splitReqBlocks(specText || "");
  const refsOf = (t) => {
    const s = new Set(t.reqRefs.map((r) => r.toLowerCase()));
    for (const m of t.title.matchAll(/\[(?:R|spec):\s*([^\]]+)\]/gi)) s.add(m[1].trim().toLowerCase());
    return s;
  };
  const rows = reqs.map((r) => ({
    requirement: r.name,
    scenarios: r.scenarios,
    tasks: tasks.filter((t) => refsOf(t).has(r.name.toLowerCase())).map((t) => t.num),
  }));
  const known = new Set(reqs.map((r) => r.name.toLowerCase()));
  const unknown = [];
  tasks.forEach((t) => refsOf(t).forEach((ref) => { if (!known.has(ref)) unknown.push(`T${t.num}→${ref}`); }));
  const uncovered = rows.filter((r) => r.tasks.length === 0).map((r) => r.requirement);
  return { rows, unknown, uncovered };
}

/* ───────────── Secrets scanner ───────────── */
const SECRET_PATTERNS = [
  ["AWS access key", /AKIA[0-9A-Z]{16}/g],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{30,}/g],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{10,}/g],
  ["Google API key", /AIza[0-9A-Za-z\-_]{35}/g],
  ["Private key block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ["Stripe/Razorpay live key", /(?:sk_live_[0-9a-zA-Z]{20,}|rzp_live_[0-9A-Za-z]{10,})/g],
  ["JWT", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["Assigned secret literal", /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"'\s]{8,}["']/gi],
];
const PLACEHOLDER = /(<[^>]+>|your[-_]|xxxx|example|\$\{|CHANGE_ME|placeholder|dummy|redacted)/i;

export function scanSecrets(text, filename = "input") {
  const out = [];
  (text || "").split("\n").forEach((line, i) => {
    if (/aisdlc:allow-secret/.test(line)) return;
    for (const [family, re] of SECRET_PATTERNS) {
      re.lastIndex = 0;
      const m = re.exec(line);
      if (m && !PLACEHOLDER.test(m[0]) && !PLACEHOLDER.test(line)) {
        out.push({ family, file: filename, line: i + 1, snippet: `${m[0].slice(0, 6)}…` });
      }
    }
  });
  return out;
}

/* ───────────── Acceptance table ───────────── */
export function parseAcceptance(text) {
  const rows = [];
  for (const line of (text || "").split("\n")) {
    if (!/^\|/.test(line) || /^\|\s*-/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 3 || /^id$/i.test(cells[0])) continue;
    const result = (cells[cells.length - 1] || "").toLowerCase();
    const evidence = cells[cells.length - 2] || "";
    rows.push({ id: cells[0], evidence, result });
  }
  return rows;
}

/* ───────────── Gates ─────────────
 * ctx = {
 *   spec, plan, tasks(text), acceptance, rollout, guardrails, runbook, evals, kind,
 *   author, approvals: [{gate, by, hash, prev, at}], evidence: [{label, exitCode, command, at}],
 *   secretFindings: [...], policy: {minApprovals: {G1: 1}}
 * }
 */
export function artifactHashFor(gate, ctx) {
  const map = {
    G1: ctx.plan || "",
    G2: (ctx.spec || "") + (ctx.plan || "") + (ctx.tasks || ""),
    G3: ctx.tasks || "",
    G4: ctx.acceptance || "",
    G5: ctx.rollout || "",
    G6: (ctx.guardrails || "") + (ctx.runbook || ""),
  };
  return sha256(map[gate]);
}

function freshSodApprovals(ctx, gate) {
  const hash = artifactHashFor(gate, ctx);
  const all = (ctx.approvals || []).filter((a) => a.gate === gate);
  const sod = all.filter((a) => !ctx.author || a.by.toLowerCase() !== String(ctx.author).toLowerCase());
  const fresh = sod.filter((a) => a.hash === hash);
  return { all, sod, fresh, hash };
}

export function runGate(gate, ctx) {
  const checks = [];
  const lane = normalizeLane(ctx.lane);
  const need = Math.max(ctx.policy?.minApprovals?.[gate] ?? 1, LANE_MIN_APPROVALS[lane]);
  const push = (name, ok, detail = "") => checks.push({ name, ok, detail });
  const nonEmpty = (s, n = 40) => (s || "").trim().length > n;

  switch (gate) {
    case "G1": {
      push("plan.md exists and is not a stub", nonEmpty(ctx.plan), ctx.plan ? `${ctx.plan.length} chars` : "missing");
      const { all, sod, fresh } = freshSodApprovals(ctx, "G1");
      const stale = sod.length - fresh.length;
      const selfSigned = all.length - sod.length;
      push(
        `G1 approval (SoD, ≥${need})`,
        fresh.length >= need,
        `${fresh.length}/${need} on current plan hash` +
          (stale ? `, ${stale} stale (plan edited after approval)` : "") +
          (selfSigned ? `, ${selfSigned} rejected (approver = author)` : ""),
      );
      break;
    }
    case "G2": {
      const v = validateSpec(ctx.spec || "");
      const tasks = parseTasks(ctx.tasks || "");
      push("spec, plan and tasks exist", !!(nonEmpty(ctx.spec) && nonEmpty(ctx.plan) && tasks.length), `${tasks.length} task(s)`);
      push("spec valid (EARS)", v.errors.length === 0, v.errors[0] || `${v.requirements.length} requirement(s)`);
      push("spec §5 signed by a human", !!v.signedBy || !specSignatureRequired(lane), v.signedBy ? `signed by ${v.signedBy}` : specSignatureRequired(lane) ? "Approved-by unsigned" : "not required for spike lane");
      push("plan has ## Traceability", /^##\s+Traceability/m.test(ctx.plan || ""), "");
      const tr = traceMatrix(ctx.spec || "", tasks);
      push("every requirement traced to a task", tr.uncovered.length === 0, tr.uncovered.length ? `uncovered: ${tr.uncovered.join(", ")}` : "full coverage");
      push("no unknown requirement references", tr.unknown.length === 0, tr.unknown.length ? tr.unknown.join(", ") : "");
      break;
    }
    case "G3": {
      const f = ctx.secretFindings || [];
      push("secrets scan clean", f.length === 0, f.length ? `${f.length} finding(s): ${[...new Set(f.map((x) => x.family))].join(", ")}` : "0 findings");
      const runs = (ctx.evidence || []).filter((e) => (lane === "spike" ? /^(green|full|spike)$/i : /^(green|full)$/i).test(e.label || ""));
      const latestFull = [...(ctx.evidence || [])].reverse().find((e) => (lane === "spike" ? /^(full|spike)$/i : /^full$/i).test(e.label || ""));
      push("test evidence present", runs.length > 0, runs.length ? `${runs.length} recorded run(s)` : "no run artifact: IMPLEMENTED-NOT-VERIFIED");
      push("full suite recorded", !!latestFull, latestFull ? `${latestFull.command}` : "run: aisdlc evidence <slug> --label full -- <test cmd>");
      push("latest full run green", !!latestFull && latestFull.exitCode === 0, latestFull ? `exit ${latestFull.exitCode}` : "");
      const tasks = parseTasks(ctx.tasks || "");
      const open = tasks.filter((t) => !t.done);
      push("all tasks checked off", lane === "spike" ? open.length === 0 : tasks.length > 0 && open.length === 0, open.length ? `open: ${open.map((t) => `T${t.num}`).join(", ")}` : `${tasks.length} done`);
      break;
    }
    case "G4": {
      const rows = parseAcceptance(ctx.acceptance || "");
      push("acceptance table has rows", rows.length > 0, `${rows.length} row(s)`);
      const bad = rows.filter((r) => r.result !== "pass");
      push("every row passes", rows.length > 0 && bad.length === 0, bad.length ? `not pass: ${bad.map((r) => r.id).join(", ")}` : "");
      const noEv = rows.filter((r) => !r.evidence || /^<|pending|none|tbd|\(none\)/i.test(r.evidence));
      push("every row cites evidence", rows.length > 0 && noEv.length === 0, noEv.length ? `missing: ${noEv.map((r) => r.id).join(", ")}` : "");
      const signer = approvedBy(ctx.acceptance || "");
      const { fresh } = freshSodApprovals(ctx, "G4");
      const signedOk = (!!signer && (!ctx.author || signer.toLowerCase() !== String(ctx.author).toLowerCase())) || fresh.length >= need;
      push("human sign-off (SoD)", signedOk, signer ? `signed by ${signer}` : fresh.length ? `${fresh.length} approval(s)` : "unsigned");
      break;
    }
    case "G5": {
      push("rollout.md exists", nonEmpty(ctx.rollout), "");
      push("rollout has ## Rollback with steps", /^##\s+Rollback/m.test(ctx.rollout || "") && /^\s*(1\.|-)\s+/m.test((ctx.rollout || "").split(/^##\s+Rollback/m)[1] || ""), "");
      const { fresh, sod } = freshSodApprovals(ctx, "G5");
      push(`G5 approval (SoD, ≥${need})`, fresh.length >= need, `${fresh.length}/${need} on current rollout hash${sod.length > fresh.length ? " (stale ignored)" : ""}`);
      break;
    }
    case "G6": {
      const g = ctx.guardrails || "";
      push("guardrails.yaml has budgets", /^budgets:/m.test(g) && /latency|error_rate|cost/.test(g), "");
      push("guardrails.yaml names a kill_switch", /^kill_switch:\s*\S+/m.test(g) && !/kill_switch:\s*<|TODO/.test(g), "");
      push("runbook.md has Symptoms → Actions", /Symptoms/i.test(ctx.runbook || ""), "");
      if (ctx.kind === "ml") push("evals.md present with thresholds", /threshold/i.test(ctx.evals || ""), "");
      break;
    }
    default:
      throw new Error(`Unknown gate ${gate}`);
  }
  const required = laneRequires(lane, gate);
  return { gate, title: GATE_TITLES[gate], passed: checks.every((c) => c.ok), required, skipped: !required, checks, artifactHash: artifactHashFor(gate, ctx) };
}

export function runAllGates(ctx) {
  return Object.fromEntries(GATES.map((g) => [g, runGate(g, ctx)]));
}

/* ───────────── Flow state machine ───────────── */
export const STATES = ["DISCOVER", "SPECIFY", "PLAN", "TASKS", "BUILD", "VERIFY", "ACCEPT", "RELEASE", "OPERATE", "DONE"];
const STATE_SKILL = {
  DISCOVER: "aisdlc-discover",
  SPECIFY: "aisdlc-spec",
  PLAN: "aisdlc-plan",
  TASKS: "aisdlc-tasks",
  BUILD: "aisdlc-implement",
  VERIFY: "aisdlc-verify",
  ACCEPT: "aisdlc-review",
  RELEASE: "aisdlc-release",
  OPERATE: "aisdlc-release",
  DONE: "aisdlc-retro",
};

export function deriveFlow(ctx) {
  const gates = runAllGates(ctx);
  const lane = normalizeLane(ctx.lane);
  const spec = validateSpec(ctx.spec || "");
  const tasks = parseTasks(ctx.tasks || "");
  const req = (g) => laneRequires(lane, g);
  const failing = (g) => gates[g].checks.filter((c) => !c.ok).map((c) => `${g}: ${c.name}${c.detail ? ` (${c.detail})` : ""}`);
  let state;
  let blocking = [];
  let owner = "agent";
  if (!ctx.hasBrief && !(ctx.spec || "").trim()) {
    state = "DISCOVER";
    blocking = ["No docs/brief.md and no spec yet."];
  } else if (!(ctx.spec || "").trim() || spec.errors.length) {
    state = "SPECIFY";
    blocking = spec.errors.length ? spec.errors : ["spec.md is empty."];
  } else if (!spec.signedBy && specSignatureRequired(lane)) {
    state = "SPECIFY";
    owner = "human";
    blocking = ["spec.md §5 Approved-by is unsigned. A human signs it."];
  } else if (req("G1") && !gates.G1.passed) {
    state = "PLAN";
    blocking = failing("G1");
    if (gates.G1.checks[0].ok) owner = "human";
  } else if (req("G2") && !gates.G2.passed) {
    state = "TASKS";
    blocking = failing("G2");
  } else if (tasks.some((t) => !t.done)) {
    state = "BUILD";
    blocking = [`${tasks.filter((t) => !t.done).length} open task(s)`];
  } else if (req("G3") && !gates.G3.passed) {
    state = "VERIFY";
    blocking = failing("G3");
  } else if (req("G4") && !gates.G4.passed) {
    state = "ACCEPT";
    blocking = failing("G4");
    if (gates.G4.checks.slice(0, 3).every((c) => c.ok)) owner = "human";
  } else if (req("G5") && !gates.G5.passed) {
    state = "RELEASE";
    blocking = failing("G5");
    if (gates.G5.checks.slice(0, 2).every((c) => c.ok)) owner = "human";
  } else if (req("G6") && !gates.G6.passed) {
    state = "OPERATE";
    blocking = failing("G6");
  } else {
    state = "DONE";
  }
  const nextTask = tasks.find((t) => !t.done) || null;
  const skill = state === "DONE" ? "aisdlc-retro" : STATE_SKILL[state];
  return { state, lane, owner, blocking, skill, nextTask, gates, requiredGates: LANE_GATES[lane], spec: { errors: spec.errors, warnings: spec.warnings, signedBy: spec.signedBy }, tasks: { total: tasks.length, done: tasks.filter((t) => t.done).length } };
}

/* ───────────── Approvals: hash chain ───────────── */
export function chainApproval(existing, entry) {
  const prev = existing.length ? existing[existing.length - 1].id : "genesis";
  const body = { ...entry, prev };
  const id = sha256(JSON.stringify(body));
  return { ...body, id };
}

export function verifyChain(list) {
  let prev = "genesis";
  for (let i = 0; i < list.length; i++) {
    const { id, ...body } = list[i];
    if (body.prev !== prev) return { ok: false, at: i, reason: "prev pointer mismatch" };
    if (sha256(JSON.stringify(body)) !== id) return { ok: false, at: i, reason: "entry hash mismatch" };
    prev = id;
  }
  return { ok: true, length: list.length };
}
