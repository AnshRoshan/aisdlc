#!/usr/bin/env node
/**
 * aisdlc CLI: install the process into any harness, scaffold features, and run the deterministic checks.
 * Zero dependencies. Node 18+.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, basename, resolve, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { GATES, GATE_TITLES, KINDS, KIND_HINTS, LANES, LANE_HINTS, LANE_GATES, normalizeLane, laneRequires, validateSpec, validateDelta, parseTasks, parseAcceptance, traceMatrix, scanSecrets, runGate, runAllGates, deriveFlow, chainApproval, verifyChain, artifactHashFor, summarizeLog, formatDuration, sha256, short } from "./engine.js";
import { HARNESSES, resolveHarnessList, detectHarnesses, enforcement, COMPANIONS, detectCompanions } from "./harnesses.js";
import * as T from "./templates.js";
import { skillsSourceDir, listSkills, listAgents, read, readJson, write, writeIfMissing, ensureDir, copyOrLink, upsertBlock, slugify, gitUser, repoFiles, isTextFile, projectRoot, lastCodeChange, sourceFingerprint, isProcessArtifact, commandInvocation, gitState, treeDriftSince } from "./fsx.js";

const VERSION = "0.2.1";
const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  dim: (s) => (tty ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s) => (tty ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s) => (tty ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s) => (tty ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s) => (tty ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s) => (tty ? `\x1b[36m${s}\x1b[0m` : s),
};
const ok = (s) => `${c.green("✓")} ${s}`;
const bad = (s) => `${c.red("✗")} ${s}`;
const warn = (s) => `${c.yellow("!")} ${s}`;
// Printed paths are forward-slashed on every OS; docs and skills quote them that way.
const relp = (from, p) => relative(from, p).replace(/\\/g, "/");

/* ───────────── args ───────────── */
const BOOLEAN_FLAGS = new Set(["link", "force", "print", "json", "no-scan", "version", "help", "v", "stdio"]);
const VALUE_FLAGS = new Set(["harness", "h", "name", "kind", "lane", "slug", "author", "note", "cwd", "label", "task", "by", "out", "format", "verify", "sign"]);
const safeName = (value, label) => {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/i.test(value)) throw new Error(`${label} must be a single alphanumeric/hyphen name (1–64 characters)`);
  return value;
};
function parseArgs(argv) {
  const args = { _: [], flags: {}, passthrough: [] };
  const dd = argv.indexOf("--");
  const own = dd >= 0 ? argv.slice(0, dd) : argv;
  if (dd >= 0) args.passthrough = argv.slice(dd + 1);
  for (let i = 0; i < own.length; i++) {
    const a = own[i];
    if (a.startsWith("--")) {
      const token = a.slice(2), eq = token.indexOf("=");
      const k = eq < 0 ? token : token.slice(0, eq), v = eq < 0 ? undefined : token.slice(eq + 1);
      if (BOOLEAN_FLAGS.has(k)) {
        if (v !== undefined) throw new Error(`--${k} takes no value`);
        args.flags[k] = true;
      } else if (v !== undefined) args.flags[k] = v;
      else if (own[i + 1] && !own[i + 1].startsWith("-")) args.flags[k] = own[++i];
      else throw new Error(`--${k} requires a value`);
    } else if (a.startsWith("-") && a.length === 2) {
      const k = a[1];
      if (k === "v") args.flags[k] = true;
      else if (own[i + 1] && !own[i + 1].startsWith("-")) args.flags[k] = own[++i];
      else throw new Error(`-${k} requires a value`);
    } else args._.push(a);
  }
  return args;
}

/* ───────────── project + feature context (disk ⇒ ctx) ───────────── */
function loadConfig(root) {
  const raw = readJson(join(root, "aisdlc.json"), {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("aisdlc.json must be an object");
  const cfg = { docsDir: "docs", featuresDir: "docs/features", policy: { minApprovals: {} }, ...raw };
  for (const key of ["docsDir", "featuresDir"]) {
    const value = cfg[key];
    if (typeof value !== "string" || !value.trim() || isAbsolute(value) || /^[A-Za-z]:|^[/\\]/.test(value) || value.split(/[/\\]/).includes("..") || resolve(root, value) === resolve(root)) throw new Error(`${key} must be a relative directory inside the project`);
  }
  const minimums = cfg.policy?.minApprovals ?? {};
  if (!minimums || typeof minimums !== "object" || Array.isArray(minimums) || Object.entries(minimums).some(([gate, n]) => !GATES.includes(gate) || !Number.isSafeInteger(n) || n < 1)) throw new Error("policy.minApprovals must map gates to positive integers");
  const testPolicy = cfg.test?.gate || cfg.testGate || "configured";
  if (!["configured", "none-by-design", "none-yet"].includes(testPolicy)) throw new Error("Unknown test.gate policy");
  if (testPolicy === "none-by-design" && (typeof cfg.test?.reason !== "string" || !cfg.test.reason.trim() || /[<>]|\b(?:todo|tbd)\b/i.test(cfg.test.reason))) throw new Error("test.gate none-by-design requires test.reason");
  return cfg;
}

function featureDir(root, cfg, slug) {
  return join(root, cfg.featuresDir, slug);
}

function listFeatures(root, cfg) {
  const d = join(root, cfg.featuresDir);
  if (!existsSync(d)) return [];
  return readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

function resolveSlug(root, cfg, input) {
  const feats = listFeatures(root, cfg);
  if (!input) {
    if (feats.length === 1) return feats[0];
    if (!feats.length) fail(`No features yet. Run: aisdlc new "<title>" --kind <kind>`);
    fail(`Which feature? One of: ${feats.join(", ")}`);
  }
  if (feats.includes(input)) return input;
  const s = slugify(input);
  if (feats.includes(s)) return s;
  const hit = feats.filter((f) => f.includes(s));
  if (hit.length === 1) return hit[0];
  fail(`Unknown feature "${input}". Known: ${feats.join(", ") || "(none)"}`);
}

function loadDeltas(dir) {
  const dd = join(dir, "deltas");
  if (!existsSync(dd)) return [];
  return readdirSync(dd).filter((f) => f.endsWith(".md")).sort().map((f) => ({ file: f, text: read(join(dd, f)) }));
}

function loadEvidence(dir) {
  const ed = join(dir, "evidence");
  if (!existsSync(ed)) return [];
  return readdirSync(ed).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const rec = readJson(join(ed, f), {});
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) throw new Error(`Invalid evidence record ${f}`);
    return { ...rec, file: f };
  });
}

/**
 * Paths that moved after each signed commit. Feature artifacts are excluded because editing them is
 * the process working as designed and the artifact hash already covers it; tree drift exists to see
 * what a hash cannot: the code changed after the human signed.
 */
function treeDriftForApprovals(root, cfg, approvals) {
  const heads = [...new Set((approvals || []).map((a) => a && a.head).filter((h) => typeof h === "string"))];
  if (!heads.length) return {};
  const featurePrefix = relative(root, resolve(root, cfg.featuresDir)).replace(/\\/g, "/") + "/";
  const out = {};
  for (const head of heads) {
    const changed = treeDriftSince(root, head);
    out[head] = changed === null ? [] : changed.filter((p) => !isProcessArtifact(p.replace(/\\/g, "/"), featurePrefix));
  }
  return out;
}

function loadCtx(root, cfg, slug, { scan = true } = {}) {
  const dir = featureDir(root, cfg, slug);
  const meta = readJson(join(dir, "feature.json"), {});
  if (!meta || typeof meta !== "object" || Array.isArray(meta) || (meta.author != null && typeof meta.author !== "string")) throw new Error("feature.json must contain valid feature metadata");
  const evals = read(join(dir, "evals.md"));
  const evidence = loadEvidence(dir);
  const approvals = readJson(join(dir, "approvals.json"), []);
  if (!Array.isArray(approvals) || approvals.some((a) => !a || typeof a !== "object" || typeof a.by !== "string" || !["G1", "G4", "G5"].includes(a.gate))) throw new Error("Invalid approval log entries");
  const evidenceErrors = evidence.flatMap(({ file, recordSha256, ...rec }) => {
    const errors = [];
    if (recordSha256 && sha256(JSON.stringify(rec)) !== recordSha256) errors.push(`${file}: record checksum mismatched`);
    if (!Number.isInteger(rec.exitCode) || typeof rec.command !== "string" || !rec.command.trim() || !Number.isFinite(Date.parse(rec.startedAt)) || !/^[a-f0-9]{64}$/.test(rec.outputSha256 || "")) errors.push(`${file}: invalid run fields`);
    return errors;
  });
  const ctx = {
    slug,
    dir,
    kind: meta.kind || "other",
    lane: normalizeLane(meta.lane),
    author: meta.author || null,
    hasBrief: existsSync(join(root, cfg.docsDir, "brief.md")) || existsSync(join(dir, "brief.md")),
    spec: read(join(dir, "spec.md")),
    plan: read(join(dir, "plan.md")),
    tasks: read(join(dir, "tasks.md")),
    acceptance: read(join(dir, "acceptance.md")),
    rollout: read(join(dir, "rollout.md")),
    guardrails: read(join(dir, "guardrails.yaml")),
    runbook: read(join(dir, "runbook.md")),
    evals,
    approvals,
    approvalsIntact: verifyChain(approvals).ok,
    evidence: evidence.map((rec) => ({ ...rec, legacy: !rec.recordSha256 })),
    evidenceErrors,
    sourceSha256: sourceFingerprint(root, cfg.featuresDir),
    git: gitState(root),
    treeDrift: treeDriftForApprovals(root, cfg, approvals),
    deltas: loadDeltas(dir),
    secretFindings: scan ? scanRepo(root).slice(0, 50) : [],
    policy: cfg.policy,
    testPolicy: (cfg.test && cfg.test.gate) || cfg.testGate || "configured",
  };
  return ctx;
}

let scanCache = null;
function scanRepo(root) {
  if (scanCache) return scanCache;
  const out = [];
  for (const f of repoFiles(root)) {
    if (!isTextFile(f)) continue;
    let txt;
    try { txt = readFileSync(f, "utf8"); } catch { continue; }
    for (const x of scanSecrets(txt, relp(root, f))) out.push(x);
    if (out.length > 200) break;
  }
  scanCache = out;
  return out;
}

const sha256File = (path) => sha256(readFileSync(path).toString("utf8"));
/** `{envelope}` is replaced with the bundle path; quoting is honoured so a path with spaces survives. */
function tokenizeSigner(template, target) {
  const safe = /\s/.test(target) ? `"${target}"` : target;
  return (template.replace(/\{envelope\}/g, safe).match(/"[^"]*"|[^"\s]+/g) || []).map((t) => t.replace(/^"(.*)"$/, "$1"));
}

function fail(msg, code = 1) {  console.error(bad(msg));
  process.exit(code);
}

/* ───────────── printing ───────────── */
function printGate(res) {
  const tag = res.passed ? c.green("PASS") : res.skipped ? c.dim("SKIP") : c.red("FAIL");
  console.log(`${tag} ${c.bold(res.gate)} ${res.title} ${c.dim(`hash ${short(res.artifactHash)}`)}${res.skipped ? c.dim("  (not required by lane)") : ""}`);
  for (const ch of res.checks) console.log(`  ${ch.ok ? ok(ch.name) : bad(ch.name)}${ch.detail ? c.dim(`  ${ch.detail}`) : ""}`);
}

/* ───────────── commands ───────────── */

/** The one state shape, shared by `next --json` and the MCP surface so they cannot drift apart. */
function nextJson(root, cfg, slug) {
  const ctx = loadCtx(root, cfg, slug, { scan: false });
  const f = deriveFlow(ctx);
  const { gates, ...rest } = f;
  return {
    feature: slug, kind: ctx.kind, ...rest,
    gates: Object.fromEntries(GATES.map((g) => [g, { passed: gates[g].passed, required: gates[g].required, skipped: gates[g].skipped, failing: gates[g].checks.filter((x) => !x.ok).map((x) => x.name) }])),
  };
}

const commands = {
  async init(args, root) {
    const link = !!args.flags.link;
    const harnesses = resolveHarnessList(args.flags.harness || args.flags.h, root);
    const src = skillsSourceDir();
    const skills = listSkills(src);
    const project = args.flags.name || basename(root);
    const cfg = loadConfig(root); // Validate policy and paths before replacing any installed files.
    console.log(c.bold(`aisdlc ${VERSION}: installing into ${relp(process.cwd(), root) || "."}`));
    console.log(c.dim(`harnesses: ${harnesses.join(", ")}  ·  skills: ${skills.length}  ·  mode: ${link ? "symlink" : "copy"}`));

    const done = new Set();
    const modes = new Set();
    for (const id of harnesses) {
      const h = HARNESSES[id];
      const dest = join(root, h.skillsDir);
      if (!done.has(dest)) {
        for (const s of skills) { const mode = copyOrLink(s.path, join(dest, s.dir), link); if (mode) modes.add(mode); }
        done.add(dest);
        console.log(ok(`${h.label.padEnd(36)} ${h.skillsDir}/  (${skills.length} skills)`));
        if (h.retired) console.log(`  ${c.yellow(h.retired)}`);
        if (h.note) console.log(`  ${c.dim(h.note)}`);
      }
      const instrFile = join(root, h.instructions);
      const r = upsertBlock(instrFile, T.INSTRUCTIONS_BLOCK(skills.map((s) => s.name)), T.MARK_START, T.MARK_END, h.instructionsHeader || "");
      console.log(`  ${c.dim(`${h.instructions} ${r}`)}`);
      if (h.commandsDir) {
        for (const s of skills) {
          const d = s.description.split(".")[0];
          const body = id === "gemini-cli" ? T.GEMINI_COMMAND(s.name, d) : id === "copilot" ? T.COPILOT_PROMPT(s.name, d) : T.CLAUDE_COMMAND(s.name, d);
          write(join(root, h.commandsDir, `${s.name}${h.commandExt}`), body);
        }
        console.log(`  ${c.dim(`${h.commandsDir}/ ${skills.length} slash commands`)}`);
      }
      if (h.agentsDir) {
        const agents = listAgents();
        for (const a of agents) write(join(root, h.agentsDir, a.file), read(a.path));
        if (agents.length) console.log(`  ${c.dim(`${h.agentsDir}/ ${agents.length} read-only subagents (${agents.map((a) => a.file.replace(".md", "")).join(", ")})`)}`);
      }
    }
    if (link && modes.has("junction")) console.log(c.dim("  linked with junctions: real symlinks need Windows Developer Mode or admin rights"));
    else if (link && modes.has("symlink")) console.log(c.dim("  linked with real symlinks"));

    const created = [];
    if (writeIfMissing(join(root, "aisdlc.json"), JSON.stringify({ version: 1, project, docsDir: cfg.docsDir, featuresDir: cfg.featuresDir, harnesses, policy: { minApprovals: { G1: 1, G5: 1 } } }, null, 2) + "\n")) created.push("aisdlc.json");
    if (writeIfMissing(join(root, cfg.docsDir, "constitution.md"), T.CONSTITUTION(project))) created.push(`${cfg.docsDir}/constitution.md`);
    if (writeIfMissing(join(root, cfg.docsDir, "taste.md"), T.TASTE)) created.push(`${cfg.docsDir}/taste.md`);
    ensureDir(join(root, cfg.featuresDir));
    if (created.length) console.log(ok(`scaffolded ${created.join(", ")}`));

    const comp = detectCompanions(root);
    const missing = Object.keys(COMPANIONS).filter((k) => !comp.includes(k));
    if (missing.length) console.log(`${warn(`companions not installed: ${missing.join(", ")}`)} ${c.dim(`aisdlc bridges to them and works without them. Install: aisdlc addon all`)}`);
    else console.log(ok(`companions installed: ${comp.join(", ")}`));
    console.log(`\n${c.bold("Next:")}  tell your agent ${c.cyan('"use aisdlc-brainstorm, I want to build ..."')}  or run  ${c.cyan('aisdlc new "My feature" --kind backend --lane quick')}`);
    console.log(c.dim("Restart your agent session so it picks up the new skills."));
  },

  async new(args, root) {
    const title = args._.join(" ").trim();
    if (!title) fail('Usage: aisdlc new "<title>" [--kind backend] [--author name]');
    const kind = args.flags.kind || "other";
    if (!KINDS.includes(kind)) fail(`--kind must be one of ${KINDS.join(", ")}`);
    const lane = args.flags.lane || "standard";
    if (!LANES.includes(lane)) fail(`--lane must be one of ${LANES.join(", ")}`);
    const cfg = loadConfig(root);
    const slug = safeName(args.flags.slug || slugify(title), "--slug");
    const dir = featureDir(root, cfg, slug);
    if (existsSync(dir)) fail(`Feature "${slug}" already exists at ${relp(root, dir)}`);
    const author = args.flags.author || gitUser(root) || "unknown";
    write(join(dir, "feature.json"), T.FEATURE_JSON(title, slug, kind, author, lane));
    write(join(dir, "spec.md"), T.SPEC(title, kind, lane));
    write(join(dir, "plan.md"), T.PLAN(title));
    write(join(dir, "tasks.md"), T.TASKS(title));
    write(join(dir, "acceptance.md"), T.ACCEPTANCE(title));
    write(join(dir, "rollout.md"), T.ROLLOUT(title));
    write(join(dir, "guardrails.yaml"), T.GUARDRAILS);
    write(join(dir, "runbook.md"), T.RUNBOOK(title));
    write(join(dir, "approvals.json"), "[]\n");
    ensureDir(join(dir, "evidence"));
    ensureDir(join(dir, "deltas"));
    writeIfMissing(join(root, cfg.docsDir, "constitution.md"), T.CONSTITUTION(cfg.project || basename(root)));
    console.log(ok(`created ${relp(root, dir)}/  kind=${kind}  lane=${lane}  author=${author}`));
    console.log(c.dim(`verify model for ${kind}: ${KIND_HINTS[kind]}`));
    console.log(c.dim(`lane ${lane}: ${LANE_HINTS[lane]} → gates ${LANE_GATES[lane].join(" ")}`));
    console.log(`\nNext: ${c.cyan(`aisdlc next ${slug}`)}`);
  },

  async kinds() {
    console.log(`${c.bold("Kinds")} ${c.dim("(--kind <k>) - each kind carries its own verify model, so G3 knows what to run")}`);
    for (const k of KINDS) console.log(`  ${k.padEnd(10)} ${KIND_HINTS[k]}`);
    console.log(`${c.bold("\nLanes")} ${c.dim("(--lane <l>) - how much process a feature carries; they only ratchet up")}`);
    for (const l of LANES) console.log(`  ${l.padEnd(10)} ${LANE_HINTS[l]} ${c.dim(`→ gates ${LANE_GATES[l].join(" ")}`)}`);
  },

  async lane(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const dir = featureDir(root, cfg, slug);
    const meta = readJson(join(dir, "feature.json"), {});
    const cur = normalizeLane(meta.lane);
    const target = args._[1];
    if (!target) {
      console.log(`${c.bold(slug)} lane ${c.cyan(cur)}  ${c.dim(LANE_HINTS[cur])}  gates ${LANE_GATES[cur].join(" ")}`);
      return;
    }
    if (!LANES.includes(target)) fail(`lane must be one of ${LANES.join(", ")}`);
    const downgrade = LANES.indexOf(target) < LANES.indexOf(cur);
    if (downgrade && process.env.AISDLC_AGENT) fail("Agents cannot lower a feature lane");
    if (downgrade && !args.flags.force) fail(`Lanes only ratchet up (${cur} → ${target} is a downgrade). A human may pass --force with a --note.`);
    if (args.flags.force && !args.flags.note) fail("--force requires --note explaining why the lane is being lowered.");
    meta.lane = target;
    meta.laneHistory = [...(meta.laneHistory || []), { from: cur, to: target, at: new Date().toISOString(), by: gitUser(root) || process.env.USER || "unknown", note: args.flags.note || "" }];
    write(join(dir, "feature.json"), JSON.stringify(meta, null, 2) + "\n");
    console.log(ok(`${slug}: lane ${cur} → ${target}  gates ${LANE_GATES[target].join(" ")}`));
    console.log(c.dim("Run `aisdlc next` to see the new required gates."));
  },

  async addon(args, root) {
    const which = args._[0] || "list";
    if (which === "list") {
      const present = detectCompanions(root);
      for (const [id, cpn] of Object.entries(COMPANIONS)) console.log(`${present.includes(id) ? ok(id.padEnd(10)) : c.dim(`  ${id.padEnd(10)}`)} ${c.dim(cpn.about)}\n             ${c.cyan(cpn.install)}  ${c.dim(`bridged by ${cpn.bridge}`)}`);
      console.log(c.dim("\naisdlc addon <ponytail|grilling|code-craft|quality-tools|all> [--print]   (--print only shows the commands)"));
      return;
    }
    const ids = which === "all" ? Object.keys(COMPANIONS) : which.split(",").map((x) => x.trim());
    for (const id of ids) {
      const cpn = COMPANIONS[id];
      if (!cpn) fail(`Unknown addon "${id}". Known: ${Object.keys(COMPANIONS).join(", ")}`);
      console.log(`${c.bold(id)}: ${cpn.about}`);
      console.log(`  ${c.cyan(cpn.install)}`);
      if (args.flags.print) { for (const alt of cpn.alternatives) console.log(c.dim(`  ${alt}`)); continue; }
      const [cmd, ...rest] = commandInvocation(cpn.install.split(" "));
      const r = spawnSync(cmd, rest, { cwd: root, stdio: "inherit", shell: false });
      if (r.status !== 0) {
        console.log(warn(`${id} install did not complete (exit ${r.status ?? "?"}). Alternatives:`));
        for (const alt of cpn.alternatives) console.log(c.dim(`  ${alt}`));
        console.log(c.dim(`  aisdlc keeps working: ${cpn.bridge} falls back to its embedded copy.`));
      } else console.log(ok(`${id} installed. ${cpn.bridge} will use it. Restart your agent session.`));
    }
  },

  async status(args, root) {
    const cfg = loadConfig(root);
    const feats = listFeatures(root, cfg);
    if (!feats.length) return console.log(args.flags.json ? "[]" : c.dim('No features. Run: aisdlc new "<title>" --kind <kind>'));
    const rows = feats.map((slug) => {
      const ctx = loadCtx(root, cfg, slug, { scan: !args.flags["no-scan"] });
      const f = deriveFlow(ctx);
      return { slug, kind: ctx.kind, lane: ctx.lane, state: f.state, owner: f.owner, tasks: `${f.tasks.done}/${f.tasks.total}`, gates: GATES.map((g) => (f.gates[g].passed ? c.green("●") : f.gates[g].skipped ? c.dim("·") : c.dim("○"))).join(" ") };
    });
    if (args.flags.json) return console.log(JSON.stringify(rows, null, 2));
    console.log(c.bold("feature".padEnd(28)) + c.bold("kind".padEnd(10)) + c.bold("lane".padEnd(11)) + c.bold("state".padEnd(10)) + c.bold("owner".padEnd(8)) + c.bold("tasks".padEnd(8)) + c.bold("G1 G2 G3 G4 G5 G6"));
    for (const r of rows) console.log(r.slug.padEnd(28) + r.kind.padEnd(10) + r.lane.padEnd(11) + r.state.padEnd(10) + r.owner.padEnd(8) + r.tasks.padEnd(8) + r.gates);
    console.log(c.dim("● passed  ○ required, not passed  · not required by lane"));
  },

  async next(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const ctx = loadCtx(root, cfg, slug);
    const f = deriveFlow(ctx);
    if (args.flags.json) return console.log(JSON.stringify(nextJson(root, cfg, slug), null, 2));
    console.log(`${c.bold(slug)} ${c.dim(`(${ctx.kind} · lane ${ctx.lane})`)}  state ${c.cyan(f.state)}  owner ${f.owner === "human" ? c.yellow("human") : "agent"}`);
    console.log(GATES.map((g) => `${f.gates[g].passed ? c.green("●") : f.gates[g].skipped ? c.dim("·") : c.dim("○")} ${g}`).join("  "));
    if (f.blocking.length) { console.log(c.bold("\nblocking:")); for (const b of f.blocking) console.log(`  ${bad(b)}`); }
    if (f.nextTask) console.log(`\nnext task: ${c.bold(`T${f.nextTask.num}`)} ${f.nextTask.title} ${c.dim(`[R:${f.nextTask.reqRefs.join(", ")}]`)}`);
    if (existsSync(join(ctx.dir, "handoff.md"))) console.log(c.dim(`handoff.md present: read it for context (disk still wins on state)`));
    if (f.state === "DONE") console.log(c.green(`\nAll required gates green (${f.requiredGates.join(" ")}). Load skill: ${f.skill}`));
    else if (f.skill) console.log(`\nload skill: ${c.cyan(f.skill)}`);
  },

  async check(args, root) {
    const what = args._[0];
    if (what !== "spec" && what !== "delta") fail("Usage: aisdlc check spec|delta <path|feature>");
    let p = args._[1];
    const cfg = loadConfig(root);
    if (what === "spec") {
      if (!p || !existsSync(p)) p = join(featureDir(root, cfg, resolveSlug(root, cfg, p)), "spec.md");
      const v = validateSpec(read(p));
      console.log(c.bold(relp(root, p) || p));
      for (const r of v.requirements) console.log(`  ${r.hasShall && r.scenarios ? ok(r.name) : bad(r.name)} ${c.dim(`${r.scenarios} scenario(s)`)}`);
      v.errors.forEach((e) => console.log(bad(e)));
      v.warnings.forEach((w) => console.log(warn(w)));
      console.log(v.errors.length ? c.red(`\n${v.errors.length} error(s)`) : c.green(`\nspec valid: ${v.requirements.length} requirement(s)${v.signedBy ? `, signed by ${v.signedBy}` : ""}`));
      if (v.errors.length) process.exit(2);
      return;
    }
    if (!p || !existsSync(p)) {
      const dir = join(featureDir(root, cfg, resolveSlug(root, cfg, p)), "deltas");
      const files = existsSync(dir)
        ? readdirSync(dir).filter((f) => /^D\d+.*\.md$/i.test(f)).sort((a, b) => (Number(a.match(/^D(\d+)/i)?.[1]) || 0) - (Number(b.match(/^D(\d+)/i)?.[1]) || 0))
        : [];
      if (!files.length) fail(`No delta file found in ${relp(root, dir) || dir}`);
      p = join(dir, files[files.length - 1]);
    }
    const v = validateDelta(read(p));
    console.log(c.bold(relp(root, p) || p));
    const byType = v.rows.reduce((acc, r) => ((acc[r.type] = (acc[r.type] || 0) + 1), acc), {});
    if (v.rows.length) console.log(`  ${v.rows.length} row(s): ${Object.entries(byType).map(([k, n]) => `${n} ${k}`).join(", ")}`);
    v.errors.forEach((e) => console.log(bad(e)));
    v.warnings.forEach((w) => console.log(warn(w)));
    console.log(v.errors.length ? c.red(`\n${v.errors.length} error(s)`) : c.green(`\ndelta valid: ${v.rows.length} row(s)`));
    if (v.errors.length) process.exit(2);
  },

  async gate(args, root) {
    const g = (args._[0] || "").toUpperCase();
    if (!GATES.includes(g)) fail(`Usage: aisdlc gate <G1..G6> [feature]`);
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[1]);
    const res = runGate(g, loadCtx(root, cfg, slug));
    if (args.flags.json) console.log(JSON.stringify(res, null, 2));
    else printGate(res);
    if (res.required && !res.passed) process.exitCode = 2;
  },

  async gates(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const ctx = loadCtx(root, cfg, slug);
    let allOk = true;
    for (const g of GATES) { const r = runGate(g, ctx); printGate(r); allOk &&= !r.required || r.passed; }
    if (!allOk) process.exit(2);
  },

  async trace(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const ctx = loadCtx(root, cfg, slug, { scan: false });
    const tr = traceMatrix(ctx.spec, parseTasks(ctx.tasks));
    if (args.flags.json) {
      console.log(JSON.stringify(tr, null, 2));
      if (tr.uncovered.length || tr.unknown.length) process.exitCode = 2;
      return;
    }
    for (const r of tr.rows) console.log(`${r.tasks.length ? ok(r.requirement) : bad(r.requirement)} ${c.dim(`${r.scenarios} scenario(s)`)} → ${r.tasks.length ? r.tasks.map((t) => `T${t}`).join(", ") : c.red("uncovered")}`);
    if (tr.unknown.length) console.log(bad(`unknown references: ${tr.unknown.join(", ")}`));
    if (tr.uncovered.length || tr.unknown.length) process.exit(2);
    console.log(c.green("full traceability"));
  },

  async scan(args, root) {
    const findings = scanRepo(root);
    if (args.flags.json) {
      console.log(JSON.stringify(findings, null, 2));
      if (findings.length) process.exitCode = 2;
      return;
    }
    for (const f of findings) console.log(bad(`${f.file}:${f.line}  ${f.family}  ${c.dim(f.snippet)}`));
    console.log(findings.length ? c.red(`${findings.length} finding(s). Remove them or add a placeholder; never commit secrets.`) : c.green("secrets scan clean"));
    if (findings.length) process.exit(2);
  },

  async evidence(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const cmd = args.passthrough;
    if (!cmd.length) fail('Usage: aisdlc evidence <feature> [--label full|green|red|baseline|smoke|spike|blocked|deploy] [--task T3] -- <command>');
    const label = safeName(args.flags.label || "full", "--label");
    if (args.flags.task && !/^T[1-9]\d*$/.test(args.flags.task)) fail("--task must be a task ID such as T3");
    if (scanSecrets(cmd.join(" ")).length) fail("Command contains a secret literal; pass secrets through the environment instead");
    const sourceSha256 = sourceFingerprint(root, cfg.featuresDir);
    const started = new Date();
    const invocation = commandInvocation(cmd);
    const r = spawnSync(invocation[0], invocation.slice(1), { cwd: root, shell: false, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    const stdout = r.stdout || "";
    const stderr = r.stderr || (r.error ? String(r.error.message) : "");
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    const exitCode = r.status === null ? 127 : r.status;
    const outHash = sha256(stdout + stderr);
    const dir = join(featureDir(root, cfg, slug), "evidence");
    const stamp = started.toISOString().replace(/[:.]/g, "-");
    const file = `${stamp}-${label}${args.flags.task ? `-${args.flags.task}` : ""}-${randomUUID()}.json`;
    const outputTail = (stdout + stderr).split("\n").slice(-25).map((line) => scanSecrets(line).length ? "[redacted: detected secret literal]" : line).join("\n");
    const rec = { label, task: args.flags.task || null, command: cmd.join(" "), argv: cmd, executedArgv: invocation, cwd: ".", exitCode, startedAt: started.toISOString(), durationMs: Date.now() - started.getTime(), outputSha256: outHash, outputTail, sourceSha256, sourceChangedDuringRun: sourceSha256 !== sourceFingerprint(root, cfg.featuresDir), recordedBy: gitUser(root) || process.env.USER || "unknown", node: process.version };
    write(join(dir, file), JSON.stringify({ ...rec, recordSha256: sha256(JSON.stringify(rec)) }, null, 2) + "\n");
    console.log(`\n${exitCode === 0 ? ok("recorded") : warn(`recorded (exit ${exitCode})`)} ${c.dim(relp(root, join(dir, file)))}`);
    process.exit(exitCode === 0 ? 0 : 3);
  },

  async approve(args, root) {
    const g = (args._[0] || "").toUpperCase();
    if (!["G1", "G4", "G5"].includes(g)) fail("Usage: aisdlc approve <G1|G4|G5> <feature> --by \"<name>\" [--note text]   (human only)");
    const by = typeof args.flags.by === "string" ? args.flags.by.trim() : "";
    if (!by || /^(?:unknown|none|tbd|todo|[_-]+|<.*>)$/i.test(by)) fail("--by \"<your name>\" is required. Approvals are human actions; agents must never run this.");
    if (process.env.AISDLC_AGENT) fail("Refusing: AISDLC_AGENT is set. Agents cannot approve (segregation of duties).");
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[1]);
    const ctx = loadCtx(root, cfg, slug, { scan: false });
    if (ctx.author && ctx.author.trim().toLowerCase() === by.toLowerCase()) fail(`Segregation of duties: "${by}" is the author of ${slug}. A different human must approve.`);
    const hash = artifactHashFor(g, ctx);
    const list = ctx.approvals;
    const chain = verifyChain(list);
    if (!chain.ok) fail(`approvals.json chain is broken at #${chain.at} (${chain.reason}). Refusing to append.`);
    const binding = ctx.git || gitState(root);
    const entry = chainApproval(list, {
      gate: g, by, note: args.flags.note || "", hash, at: new Date().toISOString(),
      head: binding ? binding.head : null, tree: binding ? binding.tree : null, git: binding ? "bound" : "unavailable",
    });
    list.push(entry);
    write(join(ctx.dir, "approvals.json"), JSON.stringify(list, null, 2) + "\n");
    console.log(ok(`${g} approved by ${by} on ${short(hash)}  ${c.dim(`entry ${short(entry.id)} ← ${short(entry.prev)}`)}`));
    console.log(c.dim(binding
      ? `bound to artifact hash and commit ${short(binding.head)}; editing the artifact or moving the tree makes this stale on purpose`
      : "bound to the artifact hash only (no git repository): editing the artifact makes this stale on purpose"));
  },

  async audit(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const ctx = loadCtx(root, cfg, slug, { scan: false });
    const chain = verifyChain(ctx.approvals);
    console.log(`${chain.ok ? ok("approval chain intact") : bad(`chain broken at #${chain.at}: ${chain.reason}`)} ${c.dim(`${ctx.approvals.length} entries`)}`);
    for (const a of ctx.approvals) console.log(`  ${a.gate} ${a.by.padEnd(20)} ${a.at} ${c.dim(short(a.hash))}${a.hash === artifactHashFor(a.gate, ctx) ? "" : c.yellow(" stale")}`);
    console.log(c.bold("\nevidence"));
    for (const e of ctx.evidence) console.log(`  ${e.exitCode === 0 ? c.green("0") : c.red(String(e.exitCode))} ${(e.label || "").padEnd(8)} ${e.startedAt} ${c.dim(e.command)}`);
    for (const error of ctx.evidenceErrors) console.log(bad(error));
    if (!chain.ok || ctx.evidenceErrors.length) process.exit(2);
  },

  async report(args, root) {
    const cfg = loadConfig(root);
    const feats = listFeatures(root, cfg);
    if (!feats.length) fail("No features yet. Run: aisdlc new \"<title>\" --kind <kind>");
    const wanted = args._[0] ? [resolveSlug(root, cfg, args._[0])] : feats;
    const rows = wanted.map((slug) => {
      const ctx = loadCtx(root, cfg, slug);
      return { slug, flow: deriveFlow(ctx), s: summarizeLog(ctx, { codeChangedAt: lastCodeChange(root) }) };
    });
    if (rows.some((r) => r.s.evidence.stale || r.s.approvals.stale || r.s.approvals.drifted)) process.exitCode = 3;
    if (args.flags.json) return console.log(JSON.stringify(rows.map((r) => ({ feature: r.slug, state: r.flow.state, ...r.s })), null, 2));

    for (const { slug, flow, s } of rows) {
      if (wanted.length > 1) {
        console.log(`${c.bold(slug.padEnd(26))} ${flow.state.padEnd(9)} ${c.dim(`gates ${s.gates.passed.length}/${s.gates.required.length}`)} ${c.dim(`runs ${s.runs.total}`)} ${c.dim(`approvals ${s.approvals.total}`)}${s.evidence.stale ? c.yellow("  evidence stale") : ""}${s.approvals.stale ? c.red(`  ${s.approvals.stale} stale approval(s)`) : ""}${s.approvals.drifted ? c.red(`  ${s.approvals.drifted} tree-stale approval(s)`) : ""}`);
        continue;
      }
      console.log(`${c.bold(slug)} ${c.dim(`lane ${s.lane}`)}`);
      console.log(`  ${c.bold(flow.state.padEnd(10))} gates ${s.gates.passed.length}/${s.gates.required.length} passed${s.gates.missing.length ? c.dim(` · waiting on ${s.gates.missing.join(", ")}`) : ""} · owner: ${flow.owner}`);
      console.log(`  runs        ${s.runs.total} recorded · ${s.runs.green} green${s.runs.passRate !== null ? ` (${s.runs.passRate}%)` : ""} · ${s.runs.red} red${s.runs.wallClockMs !== null ? c.dim(` · ${formatDuration(s.runs.wallClockMs)} of work on disk`) : ""}`);
      console.log(`  labels      ${Object.entries(s.runs.labels).map(([k, v]) => `${k} ${v}`).join(" · ") || c.dim("none")}`);
      console.log(`  freshness   ${s.evidence.lastFullAt ? `last full run ${s.evidence.lastFullAt}` : c.dim("no full run recorded")}${s.evidence.stale ? c.yellow("  ← code changed after it; re-run before you claim G3") : ""}`);
      console.log(`  approvals   ${s.approvals.total} · ${s.approvals.notAuthor} not by the author · ${s.approvals.stale} stale (artifact edited after signing)${s.approvals.drifted ? c.red(` · ${s.approvals.drifted} invalidated by commits after signing (${s.approvals.driftedFiles.slice(0, 2).join(", ")})`) : ""}${c.dim(` · bound ${s.approvals.binding}`)}${s.approvals.total ? c.dim(` · ${Object.entries(s.approvals.byGate).map(([g, n]) => `${g}×${n}`).join(" ")}`) : ""}`);
      console.log(`  review      ${s.review === "independent" ? c.green("independent") : s.review === "degraded" ? c.yellow("declared degraded") : s.review === "same-family" ? c.red("same model family") : c.dim("unrecorded")}${s.review === "unrecorded" ? c.dim(" · acceptance.md has no Author model / Reviewer model") : ""}`);
      console.log(`  tasks       ${s.tasks.done}/${s.tasks.total} done${s.tasks.open.length ? c.dim(` · open: ${s.tasks.open.join(", ")}`) : ""}`);
      console.log(`  deltas      ${s.deltas ? `${s.deltas} raised · ${s.deltasDecided} decided` : c.dim("none")}`);
      if (s.slowestGap) console.log(`  slowest     ${c.dim(`${s.slowestGap.from} → ${s.slowestGap.to} took ${formatDuration(s.slowestGap.ms)}`)}`);
      console.log(`  next        ${c.cyan(flow.skill)} ${c.dim(flow.blocking[0] || "")}`);
    }
    if (rows.some((r) => r.s.evidence.stale || r.s.approvals.stale || r.s.approvals.drifted)) process.exitCode = 3;
  },

  async skills() {
    for (const s of listSkills()) console.log(`${c.bold(s.name.padEnd(20))} ${c.dim(s.description.split(".")[0])}`);
  },

  async doctor(args, root) {
    const detected = detectHarnesses(root);
    const forced = enforcement(root);
    const byId = Object.fromEntries(forced.map((f) => [f.id, f]));
    const cfg0 = loadConfig(root);
    const pol0 = cfg0.test?.gate || cfg0.testGate || "configured";
    if (args.flags.json) {
      console.log(JSON.stringify({
        detected,
        enforcement: forced,
        testPolicy: pol0,
        companions: detectCompanions(root),
        skills: listSkills().length,
      }, null, 2));
      return;
    }
    console.log(c.bold("harnesses detected: ") + (detected.length ? detected.join(", ") : c.dim("none (universal only)")));
    console.log(c.dim("enforcement: native = a guard module in this project · ci = the aisdlc gate workflow · none = gates run only when someone runs them"));
    const skills = listSkills();
    for (const [id, h] of Object.entries(HARNESSES)) {
      const dir = join(root, h.skillsDir);
      const present = skills.filter((s) => existsSync(join(dir, s.dir, "SKILL.md"))).length;
      const instr = read(join(root, h.instructions)).includes(T.MARK_START);
      const want = listAgents();
      const have = h.agentsDir ? want.filter((a) => existsSync(join(root, h.agentsDir, a.file))).length : 0;
      const level = byId[id].enforcement;
      const painted = level === "native" ? c.green(level) : level === "ci" ? c.yellow(level) : c.dim("none");
      const line = `${h.label.padEnd(36)} skills ${present}/${skills.length}  instructions ${instr ? "yes" : "no"}${h.agentsDir ? `  agents ${have}/${want.length}` : ""}  enforcement ${painted}`;
      console.log(present === skills.length && instr && have === want.length ? ok(line) : present || instr || h.agentsDir ? warn(line) : c.dim(`  ${line}`));
      if (h.retired) console.log(`  ${c.yellow(h.retired)}`);
    }
    console.log(existsSync(join(root, "aisdlc.json")) ? ok("aisdlc.json") : warn("aisdlc.json missing (run aisdlc init)"));
    console.log(existsSync(join(root, "docs", "constitution.md")) ? ok("docs/constitution.md") : warn("docs/constitution.md missing"));
    console.log(existsSync(join(root, "docs", "taste.md")) ? ok("docs/taste.md") : warn("docs/taste.md missing (run the aisdlc-taste skill)"));
    console.log(existsSync(join(root, "docs", "glossary.md")) ? ok("docs/glossary.md") : c.dim("  docs/glossary.md missing (aisdlc-discover / aisdlc-taste seed it)"));
    const cfg = loadConfig(root);
    const pol = cfg.test?.gate || cfg.testGate || "configured";
    console.log((pol === "configured" ? ok : warn)(`test gate: ${pol.padEnd(16)}${c.dim(pol === "none-by-design" ? "no full suite required; a recorded run still is (aisdlc.json test.gate)" : "G3 wants a recorded full-suite run; none-by-design is only for a repo that deliberately ships no runner")}`));
    const comp = detectCompanions(root);
    for (const [id, cpn] of Object.entries(COMPANIONS)) console.log(comp.includes(id) ? ok(`companion ${id.padEnd(10)} installed (${cpn.bridge} uses it)`) : c.dim(`  companion ${id.padEnd(10)} not installed (${cpn.bridge} uses its embedded fallback; aisdlc addon ${id})`));
  },

  async ci(args, root) {
    const cfg = loadConfig(root);
    const all = listFeatures(root, cfg);
    const slugs = args._[0] ? [resolveSlug(root, cfg, args._[0])] : all;
    const STAGE = { DISCOVER: 0, SPECIFY: 1, PLAN: 2, TASKS: 3, BUILD: 4, VERIFY: 5, ACCEPT: 6, RELEASE: 7, OPERATE: 8, DONE: 9 };
    const GATE_STAGE = { G1: 2, G2: 3, G3: 5, G4: 6, G5: 7, G6: 8 };
    const rows = slugs.map((slug) => {
      const ctx = loadCtx(root, cfg, slug, { scan: false });
      const flow = deriveFlow(ctx);
      const problems = [];
      if ((ctx.spec || "").trim()) {
        for (const e of validateSpec(ctx.spec).errors) problems.push(`spec: ${e}`);
      }
      for (const g of ["G1", "G2", "G3", "G4", "G5", "G6"]) {
        if (!laneRequires(ctx.lane, g)) continue;
        // A gate counts as crossed once the flow has reached it, or the moment a human signed it:
        // an approval that the diff invalidated must fail CI even when the state never advanced.
        const crossed = (STAGE[flow.state] ?? 0) >= GATE_STAGE[g] || (ctx.approvals || []).some((a) => a.gate === g);
        if (!crossed) continue;
        const res = runGate(g, ctx);
        if (!res.passed) for (const ch of res.checks.filter((x) => !x.ok)) problems.push(`${g}: ${ch.name}${ch.detail ? ` (${ch.detail})` : ""}`);
      }
      const s = summarizeLog(ctx, { codeChangedAt: lastCodeChange(root) });
      if (s.evidence.stale) problems.push("evidence: the last full run predates the current source");
      if (s.approvals.stale) problems.push(`approvals: ${s.approvals.stale} signed against a different artifact`);
      if (s.approvals.drifted) problems.push(`approvals: ${s.approvals.drifted} invalidated by commits after signing (${s.approvals.driftedFiles.join(", ")})`);
      return { slug, state: flow.state, lane: ctx.lane, ok: problems.length === 0, problems };
    });
    if (args.flags.json) console.log(JSON.stringify(rows, null, 2));
    else {
      if (!rows.length) console.log(c.dim("no features under the configured featuresDir; nothing to gate"));
      for (const r of rows) {
        console.log(`${r.ok ? ok(`${c.bold(r.slug.padEnd(26))} ${r.state.padEnd(9)} ${c.dim(`lane ${r.lane}`)}${r.ok ? c.dim(" · all crossed gates green") : ""}`) : bad(`${c.bold(r.slug.padEnd(26))} ${r.state.padEnd(9)} ${c.dim(`lane ${r.lane}`)}`)}`);
        for (const p of r.problems) console.log(`  ${c.red("✗")} ${p}`);
      }
    }
    if (rows.some((r) => !r.ok)) process.exit(1);
  },

  async export(args, root) {
    const { statementOf, dsseEnvelope, sarifOf, verifyBundle, ARTIFACTS } = await import("./export.js");
    const cfg = loadConfig(root);
    const outDir = resolve(root, args.flags.out || join(".aisdlc", "export"));
    if (args.flags.verify) {
      const dir = resolve(root, String(args.flags.verify));
      const statement = readJson(join(dir, "statement.json"), null);
      const envelope = readJson(join(dir, "envelope.json"), null);
      const digests = new Map();
      const collect = (sub, pattern) => {
        const base = join(dir, sub);
        if (!existsSync(base)) return;
        for (const f of readdirSync(base).filter(pattern).sort()) {
          try { digests.set(`aisdlc:bundle/${sub}/${f}`, sha256File(join(base, f))); }
          catch { digests.set(`aisdlc:bundle/${sub}/${f}`, null); }
        }
      };
      collect("artifacts", () => true);
      collect("evidence", (f) => f.endsWith(".json"));
      const errors = verifyBundle({ statement, envelope, digests });
      const unsigned = errors.filter((e) => e.startsWith("unsigned:"));
      const hard = errors.filter((e) => !e.startsWith("unsigned:"));
      for (const e of unsigned) console.log(c.yellow(`  ! ${e}`));
      if (hard.length) { for (const e of hard) console.log(bad(e)); process.exit(1); }
      console.log(ok(`bundle verified: ${dir}`));
      console.log(c.dim(`  ${digests.size} files match the statement digests. This proves the bundle was not edited after export; it does not prove who wrote it.`));
      if (envelope.signatures.length) console.log(c.dim(`  ${envelope.signatures.length} signature(s) recorded (keyid ${envelope.signatures.map((s) => s.keyid || "?").join(", ")}); check them with the signer's public key - this bundle carries none.`));
      return;
    }
    const slug = resolveSlug(root, cfg, args._[0]);
    const ctx = loadCtx(root, cfg, slug, { scan: false });
    const format = args.flags.format || "all";
    const gates = Object.values(runAllGates(ctx)).map((g) => ({
      gate: g.gate, title: g.title, required: g.required, passed: g.passed, skipped: !!g.skipped,
      failing: g.checks.filter((ch) => !ch.ok).map((ch) => ({ name: ch.name, detail: ch.detail || "" })),
    }));
    const subjects = [];
    const files = { artifacts: {}, evidence: {} };
    for (const name of ARTIFACTS) {
      const path = join(ctx.dir, name);
      if (!existsSync(path)) continue;
      const bytes = readFileSync(path);
      const id = `aisdlc:bundle/artifacts/${name}`;
      subjects.push({ name: id, digest: { sha256: sha256(bytes.toString("utf8")) } });
      files.artifacts[name] = bytes;
    }
    const evidenceDir = join(ctx.dir, "evidence");
    for (const f of existsSync(evidenceDir) ? readdirSync(evidenceDir).filter((x) => x.endsWith(".json")).sort() : []) {
      const bytes = readFileSync(join(evidenceDir, f));
      subjects.push({ name: `aisdlc:bundle/evidence/${f}`, digest: { sha256: sha256(bytes.toString("utf8")) } });
      files.evidence[f] = bytes;
    }
    const snapshot = {
      subjects,
      predicate: {
        feature: { slug, title: readJson(join(ctx.dir, "feature.json"), {}).title || slug, kind: ctx.kind, lane: ctx.lane },
        generated: { at: new Date().toISOString(), tool: "aisdlc-cli", version: VERSION },
        git: ctx.git || null,
        sourceSha256: ctx.sourceSha256 || null,
        gates,
        approvals: (ctx.approvals || []).map((a) => ({ gate: a.gate, by: a.by, at: a.at, hash: a.hash, head: a.head || null, tree: a.tree || null, git: a.git || "unavailable" })),
        evidence: (ctx.evidence || []).map((e) => ({ file: e.file, label: e.label, exitCode: e.exitCode, command: e.command, startedAt: e.startedAt, head: e.head || null, tree: e.tree || null, recordSha256: e.recordSha256 || null })),
        limits: [
          "Digests prove the bundle was not edited after export. They do not prove authorship; that needs a signature.",
          "Approval identities are names recorded by the CLI, not authenticated identities.",
          "A gate verdict is only as good as the command it was given; aisdlc cannot judge whether a test suite is meaningful.",
        ],
      },
    };
    const statement = statementOf(snapshot);
    const envelope = dsseEnvelope(statement);
    const acceptanceRows = parseAcceptance(ctx.acceptance || "");
    const sarif = sarifOf({ toolVersion: VERSION, gates, acceptanceRows, feature: slug });
    const writeJson = (p, data) => { write(p, JSON.stringify(data, null, 2) + "\n"); };

    ensureDir(join(outDir, "artifacts"));
    ensureDir(join(outDir, "evidence"));
    if (format === "all" || format === "statement") {
      writeJson(join(outDir, "statement.json"), statement);
      writeJson(join(outDir, "envelope.json"), envelope);
      for (const [name, bytes] of Object.entries(files.artifacts)) writeFileSync(join(outDir, "artifacts", name), bytes);
      for (const [name, bytes] of Object.entries(files.evidence)) writeFileSync(join(outDir, "evidence", name), bytes);
      write(join(outDir, "verify.md"), [
        `# Verification: ${slug}`,
        "",
        `Reproduce locally (offline, no registry, no service):`,
        "",
        "```",
        `npx aisdlc-cli export --verify ${relp(process.cwd(), outDir) || "."}`,
        "```",
        "",
        "That recomputes every digest in the bundle and compares it with `statement.json`.",
        envelope.signatures.length
          ? `The envelope carries ${envelope.signatures.length} signature(s). Verify them with the signer you used; this bundle contains no public key.`
          : "The envelope is unsigned: verification proves integrity against later tampering, not authorship.",
        "",
      ].join("\n"));
    }
    if (format === "all" || format === "sarif") writeJson(join(outDir, "findings.sarif"), sarif);

    if (args.flags.sign) {
      const target = join(outDir, "envelope.json");
      const argv = tokenizeSigner(String(args.flags.sign), target);
      const [cmd, ...rest] = commandInvocation(argv);
      const res = spawnSync(cmd, rest, { encoding: "utf8" });
      if (res.error || res.status !== 0) console.warn(warn(`signing skipped: ${res.error ? res.error.message : `signer exited ${res.status}`}. The bundle stays unsigned and says so.`));
      else console.log(ok(`signed by ${argv[0]}`));
    }
    console.log(ok(`exported ${slug}  ${c.dim(`${Object.keys(files.artifacts).length} artifacts · ${Object.keys(files.evidence).length} evidence records · ${sarif.runs[0].results.length} SARIF results`)}`));
    console.log(c.dim(`  ${relp(process.cwd(), outDir) || "."} · verify with: aisdlc export --verify ${relp(process.cwd(), outDir) || "."}`));
  },

  async mcp(args, root) {
    const { readLoop } = await import("./mcp.js");
    const cfg = loadConfig(root);
    const api = {
      name: "aisdlc-cli",
      version: VERSION,
      next: (feature) => nextJson(root, cfg, feature ? resolveSlug(root, cfg, String(feature)) : (listFeatures(root, cfg)[0] || (() => { throw new Error("no features under the configured featuresDir"); })())),
      status: () => listFeatures(root, cfg).map((slug) => {
        const j = nextJson(root, cfg, slug);
        return { feature: slug, kind: j.kind, lane: j.lane, state: j.state, owner: j.owner, tasks: `${j.tasks.done}/${j.tasks.total}`, blocking: j.blocking, skill: j.skill };
      }),
    };
    if (!args.flags.stdio) {
      console.log(`${c.bold("aisdlc mcp")}: a read-only MCP server over stdio. Start it with ${c.cyan("aisdlc mcp --stdio")} and speak JSON-RPC 2.0, one object per line.`);
      console.log(c.dim(`  tools: aisdlc_next, aisdlc_status · writes are absent on purpose: evidence and approvals stay CLI actions a human performs`));
      return;
    }
    readLoop(process.stdin, process.stdout, api);
  },

  async version() { console.log(VERSION); },

  async help() {
    console.log(`${c.bold("aisdlc")} ${VERSION}: agents write code, aisdlc runs the process.

${c.bold("Install")}
  aisdlc init [--harness auto|all|claude-code,codex,cursor,gemini-cli,copilot,windsurf,opencode] [--link]
  aisdlc doctor                          show what is installed where
  aisdlc skills                          list bundled skills
  aisdlc kinds                           kind verify models and lane gate sets
  aisdlc addon [ponytail|grilling|code-craft|quality-tools|all]   install the companion skills aisdlc bridges to (optional)

${c.bold("Features")}
  aisdlc new "<title>" --kind <${KINDS.join("|")}> [--lane ${LANES.join("|")}]
  aisdlc lane <feature> [lane]           show or raise a feature's lane (ratchets up; --force --note to lower)
  aisdlc status [--json]                 all features, state and gate lights
  aisdlc next [feature] [--json]         derived state, blockers, next task, skill to load

${c.bold("Checks (deterministic, from disk)")}
  aisdlc check spec <path|feature>       EARS validator
  aisdlc check delta <path|feature>      delta Change-table validator (types, Reason/Migration, FROM/TO)
  aisdlc trace [feature]                 requirement → task matrix
  aisdlc gate <G1..G6> [feature]         one gate       ·  aisdlc gates [feature]  all six
  aisdlc scan                            secrets scan over tracked files
  aisdlc ci [feature] [--json]           evaluate every crossed gate; non-zero on a regression or a stale approval
  aisdlc report [feature] [--json]       read the logs back: runs, staleness, approvals, review

${c.bold("Evidence & approvals")}
  aisdlc evidence <feature> [--label full|green|red|baseline|smoke|spike|blocked|deploy] [--task T3] -- <command>
  aisdlc approve <G1|G4|G5> <feature> --by "<human>" [--note ...]     (humans only; SoD enforced)
  aisdlc audit [feature]                 approval chain + evidence log

Evidence out
  aisdlc export <feature> [--out dir] [--format all|statement|sarif] [--sign "<cmd {envelope}>"]
  aisdlc export --verify <dir>           recompute every digest offline; non-zero on a mismatch

State for other agents
  aisdlc mcp [--stdio]                   read-only MCP over stdio: aisdlc_next, aisdlc_status (no writes)

Gates: ${GATES.map((g) => `${g} ${GATE_TITLES[g]}`).join(" · ")}
Lanes: ${LANES.map((l) => `${l} [${LANE_GATES[l].join(" ")}]`).join(" · ")}
Docs: https://github.com/AnshRoshan/aisdlc`);
  },
};

export async function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    for (const [key, value] of Object.entries(args.flags)) {
      if (!BOOLEAN_FLAGS.has(key) && !VALUE_FLAGS.has(key)) throw new Error(`Unknown flag --${key}`);
      if (VALUE_FLAGS.has(key) && (typeof value !== "string" || !value.trim())) throw new Error(`--${key} requires a non-empty value`);
    }
    const cmd = args._.shift() || "help";
    if (args.flags.version || args.flags.v) return commands.version();
    if (args.flags.help) return commands.help();
    if (!Object.hasOwn(commands, cmd)) { console.error(bad(`Unknown command "${cmd}"`)); await commands.help(); process.exitCode = 1; return; }
    const root = args.flags.cwd ? resolve(args.flags.cwd) : projectRoot();
    await commands[cmd](args, root);
  } catch (e) { fail(e.message || String(e)); }
}
