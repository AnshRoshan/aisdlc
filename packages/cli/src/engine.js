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

/* ───────────── Deltas ───────────── */
/**
 * A delta file: `# Delta D<n>: <title>` with `## Trigger`, a `## Change` table
 * (Requirement | Before | After | Type, Type ∈ modify|add|remove|rename),
 * `## Impact` and `## Decision`. Removals carry Reason + Migration; renames carry FROM/TO + Reason.
 */
export function validateDelta(text) {
  const errors = [];
  const warnings = [];
  text = text || "";
  if (!/^#\s+Delta\s+D\d+\s*:/m.test(text)) errors.push("Missing `# Delta D<n>: <title>` heading.");
  for (const s of ["Trigger", "Change", "Impact", "Decision"]) {
    if (!new RegExp(`^##\\s+${s}\\b.*$`, "m").test(text)) errors.push(`Missing \`## ${s}\` section.`);
  }
  const rows = [];
  const change = text.split(/^##\s+Change\b.*$/m)[1];
  if (change) {
    const body = change.split(/^##\s+/m)[0];
    const lines = body.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
    for (const line of lines) {
      if (/^\|[\s:|-]+\|$/.test(line) || /\|\s*Requirement\s*\|/i.test(line)) continue;
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.length < 4) {
        errors.push(`Malformed row (need Requirement | Before | After | Type): ${line}`);
        continue;
      }
      const [req, before, after, rawType] = cells;
      const type = (rawType || "").toLowerCase();
      if (!/^(modify|add|remove|rename)$/.test(type)) {
        errors.push(`Unknown Type "${rawType}" for "${req || "?"}" (modify | add | remove | rename).`);
        continue;
      }
      if (!req) errors.push("A row has no Requirement name.");
      if (type === "modify" && (!after || after === before)) {
        errors.push(`modify row "${req}" needs an After cell with the full new requirement text, different from Before.`);
      }
      if (type === "add" && !after) errors.push(`add row "${req}" has no After text.`);
      if (type === "remove" && !before) errors.push(`remove row "${req}" has no Before text - state what is being removed.`);
      rows.push({ requirement: req, type });
    }
  }
  if (change && !rows.length) errors.push("Change table has zero rows - a delta that changes nothing is noise.");
  const types = new Set(rows.map((r) => r.type));
  if (types.has("remove")) {
    if (!/^-?\s*Reason:/mi.test(text)) errors.push("remove row(s) present but no `Reason:` line.");
    if (!/^-?\s*Migration:/mi.test(text)) errors.push("remove row(s) present but no `Migration:` line (or `none - no callers (evidence: <file>)`).");
  }
  if (types.has("rename")) {
    if (!/FROM:/i.test(text)) errors.push("rename row(s) present but no `FROM:` line.");
    if (!/TO:/i.test(text)) errors.push("rename row(s) present but no `TO:` line.");
    if (!/^-?\s*Reason:/mi.test(text)) errors.push("rename row(s) present but no `Reason:` line.");
  }
  if (/^##\s+Decision\b.*$/m.test(text) && !/Approved-by:/i.test(text)) {
    warnings.push("No `Approved-by:` in ## Decision - the delta will be applied before anyone agreed to it.");
  }
  return { errors, warnings, rows };
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

/* ───────────── Cross-model review independence ─────────────
 * Segregation of duties says a human, not the author, approves. Segregation of *models*
 * is the orthogonal failure: the model that wrote the code shares its blind spots with
 * itself. The field is recorded in acceptance.md so the check reads disk, not chat.
 */
const MODEL_FAMILIES = ["opus", "sonnet", "haiku", "fable", "grok", "gemini", "llama", "deepseek", "qwen", "mistral", "gpt", "o4", "o3", "o1", "claude"];
export function modelFamily(value) {
  const v = String(value || "").toLowerCase();
  if (!v.trim()) return null;
  const hit = MODEL_FAMILIES.find((f) => new RegExp(`\\b${f}\\b`).test(v));
  return hit || v.replace(/[^a-z0-9.]+/g, "-").slice(0, 24);
}

export function reviewerNotes(text) {
  const t = text || "";
  const blank = (v) => !v || /^<[^>]*>?$|^\(.*\)$|^_+$|^\s*$|^(tbd|todo|unknown|none)$/i.test(v.trim());
  const field = (label) => {
    // Take the first *filled* occurrence: a seeded placeholder line above a real one must not
    // hide the answer, and a real answer above a placeholder must not be ignored either.
    for (const m of t.matchAll(new RegExp(`${label}:\\s*([^·\\n|]+)`, "gi"))) {
      const v = m[1].trim();
      if (!blank(v)) return v;
    }
    return "";
  };
  const note = field("Cross-model");
  return {
    author: field("Author model"),
    reviewer: field("Reviewer model"),
    degraded: /degraded/i.test(note),
    independent: /independent/i.test(note),
    note,
  };
}

/* ───────────── Value sourcing ─────────────
 * "Do I feel like I'm inventing something?" is not a test; the model rationalises a real
 * decision as wiring. Enumerating every value the build must produce, compute or display,
 * and demanding a named source for each, is mechanical and harder to talk yourself out of.
 */
export function valueSourcing(text) {
  const sec = (text || "").split(/^##\s+9\.\s*Value sourcing/im)[1];
  if (!sec) return { present: false, rows: [], unnamed: [], waived: false };
  const body = sec.split(/^##\s+/m)[0];
  const waived = /^[\s>]*n\/a:?\s+\S/im.test(body);
  const rows = body
    .split("\n")
    .filter((l) => /^\|/.test(l) && !/^\|[\s:|-]+$/.test(l))
    .slice(1)
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  const unnamed = rows.filter((r) => !r[1] || /^(n\/?a|tbd|unknown|<.*>|\s*)$/i.test(r[1]) || /needs clarification/i.test(r[1])).map((r) => r[0] || "(blank row)");
  return { present: true, rows, unnamed, waived };
}

/* ───────────── Log analysis ─────────────
 * The gates answer "is this feature allowed to move". Nobody answered "what does the log say",
 * so the evidence and approval files were write-only. This is the pure half of `aisdlc report`:
 * same files, same numbers, any machine. The one thing it cannot derive from disk is when code
 * last changed, so the caller injects that (git), and it is optional.
 */
const ts = (s) => { const t = Date.parse(s || ""); return Number.isNaN(t) ? null : t; };

export function summarizeLog(ctx = {}, { codeChangedAt = null } = {}) {
  const evidence = (ctx.evidence || []).filter((e) => e && e.startedAt);
  const byTime = [...evidence].sort((a, b) => (ts(a.startedAt) ?? 0) - (ts(b.startedAt) ?? 0));
  const green = byTime.filter((e) => e.exitCode === 0);
  const labels = {};
  for (const e of byTime) labels[e.label || "unlabeled"] = (labels[e.label || "unlabeled"] || 0) + 1;

  const lane = normalizeLane(ctx.lane);
  const lastFull = [...byTime].reverse().find((e) => (lane === "spike" ? /^(full|spike)$/i : /^full$/i).test(e.label || ""));
  const codeAt = ts(codeChangedAt);
  const fullIsStale = !!(lastFull && codeAt !== null && (ts(lastFull.startedAt) ?? 0) < codeAt);

  const approvals = ctx.approvals || [];
  const staleApprovals = approvals.filter((a) => a.hash !== artifactHashFor(a.gate, ctx));
  const notAuthor = approvals.filter((a) => !ctx.author || String(a.by).toLowerCase() !== String(ctx.author).toLowerCase());

  const gates = runAllGates(ctx);
  const passed = Object.values(gates).filter((g) => g.required && g.passed).map((g) => g.gate);
  const required = Object.values(gates).filter((g) => g.required).map((g) => g.gate);

  const timed = approvals.filter((a) => ts(a.at) !== null).sort((a, b) => ts(a.at) - ts(b.at));
  const gaps = [];
  for (let i = 1; i < timed.length; i += 1) {
    if (timed[i].gate === timed[i - 1].gate) continue;
    gaps.push({ from: timed[i - 1].gate, to: timed[i].gate, ms: ts(timed[i].at) - ts(timed[i - 1].at) });
  }
  const slowest = gaps.sort((a, b) => b.ms - a.ms)[0] || null;

  const tasks = parseTasks(ctx.tasks || "");
  const rn = reviewerNotes(ctx.acceptance || "");
  const review = rn.degraded ? "degraded" : !rn.author || !rn.reviewer ? "unrecorded"
    : modelFamily(rn.author) === modelFamily(rn.reviewer) ? "same-family" : "independent";

  const first = ts(byTime[0]?.startedAt);
  const last = ts(byTime[byTime.length - 1]?.startedAt);

  return {
    lane,
    runs: { total: byTime.length, green: green.length, red: byTime.length - green.length, labels,
      passRate: byTime.length ? Math.round((green.length / byTime.length) * 100) : null,
      wallClockMs: first !== null && last !== null ? last - first : null },
    evidence: { lastRunAt: byTime[byTime.length - 1]?.startedAt || null, lastFullAt: lastFull?.startedAt || null, stale: fullIsStale },
    gates: { required, passed, missing: required.filter((g) => !passed.includes(g)) },
    approvals: { total: approvals.length, notAuthor: notAuthor.length, stale: staleApprovals.length,
      byGate: approvals.reduce((m, a) => ({ ...m, [a.gate]: (m[a.gate] || 0) + 1 }), {}) },
    tasks: { total: tasks.length, done: tasks.filter((t) => t.done).length, open: tasks.filter((t) => !t.done).map((t) => `T${t.num}`) },
    deltas: (ctx.deltas || []).length,
    deltasDecided: (ctx.deltas || []).filter((d) => /Approved-by:\s*(?!_)\S/.test(d.text || "")).length,
    review,
    slowestGap: slowest,
  };
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return "n/a";
  if (ms < 60000) return "<1m";
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.round(h / 24)}d`;
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
      const vs = valueSourcing(ctx.spec || "");
      push(
        "every value the build produces has a named source",
        vs.present ? vs.waived || (vs.rows.length > 0 && vs.unnamed.length === 0) : false,
        !vs.present
          ? "spec has no `## 9. Value sourcing` table (or an explicit `n/a: <why>`)"
          : vs.waived
            ? "waived with a stated reason"
            : vs.rows.length === 0
              ? "table is empty - list every value this feature produces, computes or displays"
              : vs.unnamed.length
                ? `no source for: ${vs.unnamed.join(", ")}`
                : `${vs.rows.length} value(s) sourced`,
      );
      break;
    }
    case "G3": {
      const f = ctx.secretFindings || [];
      push("secrets scan clean", f.length === 0, f.length ? `${f.length} finding(s): ${[...new Set(f.map((x) => x.family))].join(", ")}` : "0 findings");
      const latestFull = [...(ctx.evidence || [])].reverse().find((e) => (lane === "spike" ? /^(full|spike)$/i : /^full$/i).test(e.label || ""));
      push("test evidence present", (ctx.evidence || []).length > 0, (ctx.evidence || []).length ? `${(ctx.evidence || []).length} recorded run(s)` : "no run artifact: IMPLEMENTED-NOT-VERIFIED");
      // Three states, from aisdlc.json test.gate: a repo with a runner, one that deliberately has
      // none, and one that simply never set it up. Only the second relaxes the suite, and it says so.
      const policy = ctx.testPolicy || "configured";
      if (policy === "none-by-design") {
        push("full suite recorded", true, `waived by test.gate: none-by-design - G3 still needs a recorded run, and G4's human sign-off carries the risk`);
      } else {
        push("full suite recorded", !!latestFull, latestFull ? `${latestFull.command}` : policy === "none-yet" ? `no runner configured (aisdlc.json test.gate): either set one up or declare none-by-design with a reason` : "run: aisdlc evidence <slug> --label full -- <test cmd>");
      }
      const green = policy === "none-by-design" && !latestFull ? [...(ctx.evidence || [])].reverse().find((e) => e.exitCode === 0) : latestFull;
      push("latest full run green", !!green && green.exitCode === 0, green ? `exit ${green.exitCode} (${green.command})` : policy === "none-by-design" ? "no green run at all, by design or not" : "");
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
      // A cited evidence file must be one the CLI actually recorded, or prose is standing in for a run.
      const logged = new Set((ctx.evidence || []).map((e) => e.file).filter(Boolean));
      const named = rows.map((r) => (r.evidence.match(/[\w.-]+\.(?:json|log)/) || [])[0]).filter(Boolean);
      const ghost = named.filter((f) => !logged.has(f));
      push("cited evidence exists in the log", named.length > 0 && ghost.length === 0, named.length === 0 ? "no row names a recorded evidence file" : ghost.length ? `not recorded: ${ghost.join(", ")}` : `${named.length} row(s) cite real runs`);
      const rn = reviewerNotes(ctx.acceptance || "");
      const sameFamily = rn.author && rn.reviewer && modelFamily(rn.author) === modelFamily(rn.reviewer);
      const crossOk = rn.degraded || (!!rn.author && !!rn.reviewer && !sameFamily);
      push(
        "review ran on a different model than wrote the code",
        crossOk,
        rn.degraded
          ? `declared ${rn.note} - not the cross-model guarantee`
          : !rn.author || !rn.reviewer
            ? "record `Author model:` and `Reviewer model:` in ## Reviewer notes, or `Cross-model: degraded (why)`"
            : sameFamily
              ? `both on ${modelFamily(rn.author)}; the author's own model shares its blind spots`
              : `${rn.author} wrote, ${rn.reviewer} reviewed`,
      );
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
