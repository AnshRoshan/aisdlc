#!/usr/bin/env node
/**
 * aisdlc CLI: install the process into any harness, scaffold features, and run the deterministic checks.
 * Zero dependencies. Node 18+.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { GATES, GATE_TITLES, KINDS, KIND_HINTS, LANES, LANE_HINTS, LANE_GATES, normalizeLane, validateSpec, parseTasks, traceMatrix, scanSecrets, runGate, deriveFlow, chainApproval, verifyChain, artifactHashFor, sha256, short } from "./engine.js";
import { HARNESSES, resolveHarnessList, detectHarnesses, COMPANIONS, detectCompanions } from "./harnesses.js";
import * as T from "./templates.js";
import { skillsSourceDir, listSkills, read, readJson, write, writeIfMissing, ensureDir, copyOrLink, upsertBlock, slugify, gitUser, repoFiles, isTextFile, projectRoot } from "./fsx.js";

const VERSION = "0.2.0";
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

/* ───────────── args ───────────── */
function parseArgs(argv) {
  const args = { _: [], flags: {}, passthrough: [] };
  const dd = argv.indexOf("--");
  const own = dd >= 0 ? argv.slice(0, dd) : argv;
  if (dd >= 0) args.passthrough = argv.slice(dd + 1);
  for (let i = 0; i < own.length; i++) {
    const a = own[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      if (v !== undefined) args.flags[k] = v;
      else if (own[i + 1] && !own[i + 1].startsWith("-")) args.flags[k] = own[++i];
      else args.flags[k] = true;
    } else if (a.startsWith("-") && a.length === 2) {
      args.flags[a[1]] = own[i + 1] && !own[i + 1].startsWith("-") ? own[++i] : true;
    } else args._.push(a);
  }
  return args;
}

/* ───────────── project + feature context (disk ⇒ ctx) ───────────── */
function loadConfig(root) {
  return { docsDir: "docs", featuresDir: "docs/features", policy: { minApprovals: {} }, ...readJson(join(root, "aisdlc.json"), {}) };
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

function loadEvidence(dir) {
  const ed = join(dir, "evidence");
  if (!existsSync(ed)) return [];
  return readdirSync(ed).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, ...readJson(join(ed, f), {}) }));
}

function loadCtx(root, cfg, slug, { scan = true } = {}) {
  const dir = featureDir(root, cfg, slug);
  const meta = readJson(join(dir, "feature.json"), {});
  const evals = read(join(dir, "evals.md"));
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
    approvals: readJson(join(dir, "approvals.json"), []),
    evidence: loadEvidence(dir),
    secretFindings: scan ? scanRepo(root).slice(0, 50) : [],
    policy: cfg.policy,
  };
  return ctx;
}

let scanCache = null;
function scanRepo(root) {
  if (scanCache) return scanCache;
  const out = [];
  for (const f of repoFiles(root)) {
    if (!isTextFile(f)) continue;
    if (/\/docs\/features\/[^/]+\/evidence\//.test(f)) continue;
    let txt;
    try { txt = readFileSync(f, "utf8"); } catch { continue; }
    for (const x of scanSecrets(txt, relative(root, f))) out.push(x);
    if (out.length > 200) break;
  }
  scanCache = out;
  return out;
}

function fail(msg, code = 1) {
  console.error(bad(msg));
  process.exit(code);
}

/* ───────────── printing ───────────── */
function printGate(res) {
  const tag = res.passed ? c.green("PASS") : res.skipped ? c.dim("SKIP") : c.red("FAIL");
  console.log(`${tag} ${c.bold(res.gate)} ${res.title} ${c.dim(`hash ${short(res.artifactHash)}`)}${res.skipped ? c.dim("  (not required by lane)") : ""}`);
  for (const ch of res.checks) console.log(`  ${ch.ok ? ok(ch.name) : bad(ch.name)}${ch.detail ? c.dim(`  ${ch.detail}`) : ""}`);
}

/* ───────────── commands ───────────── */
const commands = {
  async init(args, root) {
    const link = !!args.flags.link;
    const harnesses = resolveHarnessList(args.flags.harness || args.flags.h, root);
    const src = skillsSourceDir();
    const skills = listSkills(src);
    const project = args.flags.name || basename(root);
    console.log(c.bold(`aisdlc ${VERSION}: installing into ${relative(process.cwd(), root) || "."}`));
    console.log(c.dim(`harnesses: ${harnesses.join(", ")}  ·  skills: ${skills.length}  ·  mode: ${link ? "symlink" : "copy"}`));

    const done = new Set();
    for (const id of harnesses) {
      const h = HARNESSES[id];
      const dest = join(root, h.skillsDir);
      if (!done.has(dest)) {
        for (const s of skills) copyOrLink(s.path, join(dest, s.dir), link);
        done.add(dest);
        console.log(ok(`${h.label.padEnd(36)} ${h.skillsDir}/  (${skills.length} skills)`));
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
    }

    const cfg = loadConfig(root);
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
    const slug = args.flags.slug || slugify(title);
    const dir = featureDir(root, cfg, slug);
    if (existsSync(dir)) fail(`Feature "${slug}" already exists at ${relative(root, dir)}`);
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
    console.log(ok(`created ${relative(root, dir)}/  kind=${kind}  lane=${lane}  author=${author}`));
    console.log(c.dim(`verify model for ${kind}: ${KIND_HINTS[kind]}`));
    console.log(c.dim(`lane ${lane}: ${LANE_HINTS[lane]} → gates ${LANE_GATES[lane].join(" ")}`));
    console.log(`\nNext: ${c.cyan(`aisdlc next ${slug}`)}`);
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
    if (LANES.indexOf(target) < LANES.indexOf(cur) && !args.flags.force) fail(`Lanes only ratchet up (${cur} → ${target} is a downgrade). A human may pass --force with a --note.`);
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
      console.log(c.dim("\naisdlc addon <ponytail|grilling|all> [--print]   (--print only shows the commands)"));
      return;
    }
    const ids = which === "all" ? Object.keys(COMPANIONS) : which.split(",").map((x) => x.trim());
    for (const id of ids) {
      const cpn = COMPANIONS[id];
      if (!cpn) fail(`Unknown addon "${id}". Known: ${Object.keys(COMPANIONS).join(", ")}`);
      console.log(`${c.bold(id)}: ${cpn.about}`);
      console.log(`  ${c.cyan(cpn.install)}`);
      if (args.flags.print) { for (const alt of cpn.alternatives) console.log(c.dim(`  ${alt}`)); continue; }
      const [cmd, ...rest] = cpn.install.split(" ");
      const r = spawnSync(cmd, rest, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
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
    if (!feats.length) return console.log(c.dim('No features. Run: aisdlc new "<title>" --kind <kind>'));
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
    if (args.flags.json) {
      const { gates, ...rest } = f;
      return console.log(JSON.stringify({ feature: slug, kind: ctx.kind, ...rest, gates: Object.fromEntries(GATES.map((g) => [g, { passed: gates[g].passed, required: gates[g].required, skipped: gates[g].skipped, failing: gates[g].checks.filter((x) => !x.ok).map((x) => x.name) }])) }, null, 2));
    }
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
    if (what !== "spec") fail("Usage: aisdlc check spec <path|feature>");
    let p = args._[1];
    const cfg = loadConfig(root);
    if (!p || !existsSync(p)) p = join(featureDir(root, cfg, resolveSlug(root, cfg, p)), "spec.md");
    const v = validateSpec(read(p));
    console.log(c.bold(relative(root, p) || p));
    for (const r of v.requirements) console.log(`  ${r.hasShall && r.scenarios ? ok(r.name) : bad(r.name)} ${c.dim(`${r.scenarios} scenario(s)`)}`);
    v.errors.forEach((e) => console.log(bad(e)));
    v.warnings.forEach((w) => console.log(warn(w)));
    console.log(v.errors.length ? c.red(`\n${v.errors.length} error(s)`) : c.green(`\nspec valid: ${v.requirements.length} requirement(s)${v.signedBy ? `, signed by ${v.signedBy}` : ""}`));
    if (v.errors.length) process.exit(2);
  },

  async gate(args, root) {
    const g = (args._[0] || "").toUpperCase();
    if (!GATES.includes(g)) fail(`Usage: aisdlc gate <G1..G6> [feature]`);
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[1]);
    const res = runGate(g, loadCtx(root, cfg, slug));
    if (args.flags.json) return console.log(JSON.stringify(res, null, 2));
    printGate(res);
    if (!res.passed) process.exit(2);
  },

  async gates(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const ctx = loadCtx(root, cfg, slug);
    let allOk = true;
    for (const g of GATES) { const r = runGate(g, ctx); printGate(r); allOk &&= r.passed; }
    if (!allOk) process.exit(2);
  },

  async trace(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const ctx = loadCtx(root, cfg, slug, { scan: false });
    const tr = traceMatrix(ctx.spec, parseTasks(ctx.tasks));
    if (args.flags.json) return console.log(JSON.stringify(tr, null, 2));
    for (const r of tr.rows) console.log(`${r.tasks.length ? ok(r.requirement) : bad(r.requirement)} ${c.dim(`${r.scenarios} scenario(s)`)} → ${r.tasks.length ? r.tasks.map((t) => `T${t}`).join(", ") : c.red("uncovered")}`);
    if (tr.unknown.length) console.log(bad(`unknown references: ${tr.unknown.join(", ")}`));
    if (tr.uncovered.length || tr.unknown.length) process.exit(2);
    console.log(c.green("full traceability"));
  },

  async scan(args, root) {
    const findings = scanRepo(root);
    if (args.flags.json) return console.log(JSON.stringify(findings, null, 2));
    for (const f of findings) console.log(bad(`${f.file}:${f.line}  ${f.family}  ${c.dim(f.snippet)}`));
    console.log(findings.length ? c.red(`${findings.length} finding(s). Remove them or add a placeholder; never commit secrets.`) : c.green("secrets scan clean"));
    if (findings.length) process.exit(2);
  },

  async evidence(args, root) {
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[0]);
    const cmd = args.passthrough;
    if (!cmd.length) fail('Usage: aisdlc evidence <feature> [--label full|green|red|blocked|deploy] [--task T3] -- <command>');
    const label = args.flags.label || "full";
    const started = new Date();
    const r = spawnSync(cmd[0], cmd.slice(1), { cwd: root, shell: process.platform === "win32", encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    const stdout = r.stdout || "";
    const stderr = r.stderr || (r.error ? String(r.error.message) : "");
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    const exitCode = r.status === null ? 127 : r.status;
    const outHash = sha256(stdout + stderr);
    const dir = join(featureDir(root, cfg, slug), "evidence");
    const stamp = started.toISOString().replace(/[:.]/g, "-");
    const file = `${stamp}-${label}${args.flags.task ? `-${args.flags.task}` : ""}.json`;
    const rec = { label, task: args.flags.task || null, command: cmd.join(" "), cwd: ".", exitCode, startedAt: started.toISOString(), durationMs: Date.now() - started.getTime(), outputSha256: outHash, outputTail: (stdout + stderr).split("\n").slice(-25).join("\n"), recordedBy: gitUser(root) || process.env.USER || "unknown", node: process.version };
    write(join(dir, file), JSON.stringify(rec, null, 2) + "\n");
    console.log(`\n${exitCode === 0 ? ok("recorded") : warn(`recorded (exit ${exitCode})`)} ${c.dim(relative(root, join(dir, file)))}`);
    process.exit(exitCode === 0 ? 0 : 3);
  },

  async approve(args, root) {
    const g = (args._[0] || "").toUpperCase();
    if (!["G1", "G4", "G5"].includes(g)) fail("Usage: aisdlc approve <G1|G4|G5> <feature> --by \"<name>\" [--note text]   (human only)");
    const by = args.flags.by;
    if (!by || by === true) fail("--by \"<your name>\" is required. Approvals are human actions; agents must never run this.");
    if (process.env.AISDLC_AGENT) fail("Refusing: AISDLC_AGENT is set. Agents cannot approve (segregation of duties).");
    const cfg = loadConfig(root);
    const slug = resolveSlug(root, cfg, args._[1]);
    const ctx = loadCtx(root, cfg, slug, { scan: false });
    if (ctx.author && ctx.author.toLowerCase() === String(by).toLowerCase() && !args.flags.force) fail(`Segregation of duties: "${by}" is the author of ${slug}. A different human must approve.`);
    const hash = artifactHashFor(g, ctx);
    const list = ctx.approvals;
    const chain = verifyChain(list);
    if (!chain.ok) fail(`approvals.json chain is broken at #${chain.at} (${chain.reason}). Refusing to append.`);
    const entry = chainApproval(list, { gate: g, by, note: args.flags.note || "", hash, at: new Date().toISOString() });
    list.push(entry);
    write(join(ctx.dir, "approvals.json"), JSON.stringify(list, null, 2) + "\n");
    console.log(ok(`${g} approved by ${by} on ${short(hash)}  ${c.dim(`entry ${short(entry.id)} ← ${short(entry.prev)}`)}`));
    console.log(c.dim("Editing the underlying artifact changes its hash and makes this approval stale on purpose."));
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
    if (!chain.ok) process.exit(2);
  },

  async skills() {
    for (const s of listSkills()) console.log(`${c.bold(s.name.padEnd(20))} ${c.dim(s.description.split(".")[0])}`);
  },

  async doctor(args, root) {
    const detected = detectHarnesses(root);
    console.log(c.bold("harnesses detected: ") + (detected.length ? detected.join(", ") : c.dim("none (universal only)")));
    const skills = listSkills();
    for (const [id, h] of Object.entries(HARNESSES)) {
      const dir = join(root, h.skillsDir);
      const present = skills.filter((s) => existsSync(join(dir, s.dir, "SKILL.md"))).length;
      const instr = read(join(root, h.instructions)).includes(T.MARK_START);
      const line = `${h.label.padEnd(36)} skills ${present}/${skills.length}  instructions ${instr ? "yes" : "no"}`;
      console.log(present === skills.length && instr ? ok(line) : present || instr ? warn(line) : c.dim(`  ${line}`));
    }
    console.log(existsSync(join(root, "aisdlc.json")) ? ok("aisdlc.json") : warn("aisdlc.json missing (run aisdlc init)"));
    console.log(existsSync(join(root, "docs", "constitution.md")) ? ok("docs/constitution.md") : warn("docs/constitution.md missing"));
    console.log(existsSync(join(root, "docs", "taste.md")) ? ok("docs/taste.md") : warn("docs/taste.md missing (run the aisdlc-taste skill)"));
    console.log(existsSync(join(root, "docs", "glossary.md")) ? ok("docs/glossary.md") : c.dim("  docs/glossary.md missing (aisdlc-discover / aisdlc-taste seed it)"));
    const comp = detectCompanions(root);
    for (const [id, cpn] of Object.entries(COMPANIONS)) console.log(comp.includes(id) ? ok(`companion ${id.padEnd(10)} installed (${cpn.bridge} uses it)`) : c.dim(`  companion ${id.padEnd(10)} not installed (${cpn.bridge} uses its embedded fallback; aisdlc addon ${id})`));
  },

  async version() { console.log(VERSION); },

  async help() {
    console.log(`${c.bold("aisdlc")} ${VERSION}: agents write code, aisdlc runs the process.

${c.bold("Install")}
  aisdlc init [--harness auto|all|claude-code,codex,cursor,gemini-cli,copilot,windsurf,opencode] [--link]
  aisdlc doctor                          show what is installed where
  aisdlc skills                          list bundled skills
  aisdlc addon [ponytail|grilling|all]   install the companion skills aisdlc bridges to (optional)

${c.bold("Features")}
  aisdlc new "<title>" --kind <${KINDS.join("|")}> [--lane ${LANES.join("|")}]
  aisdlc lane <feature> [lane]           show or raise a feature's lane (ratchets up; --force --note to lower)
  aisdlc status [--json]                 all features, state and gate lights
  aisdlc next [feature] [--json]         derived state, blockers, next task, skill to load

${c.bold("Checks (deterministic, from disk)")}
  aisdlc check spec <path|feature>       EARS validator
  aisdlc trace [feature]                 requirement → task matrix
  aisdlc gate <G1..G6> [feature]         one gate       ·  aisdlc gates [feature]  all six
  aisdlc scan                            secrets scan over tracked files

${c.bold("Evidence & approvals")}
  aisdlc evidence <feature> [--label full|green|red|blocked|deploy] [--task T3] -- <command>
  aisdlc approve <G1|G4|G5> <feature> --by "<human>" [--note ...]     (humans only; SoD enforced)
  aisdlc audit [feature]                 approval chain + evidence log

Gates: ${GATES.map((g) => `${g} ${GATE_TITLES[g]}`).join(" · ")}
Lanes: ${LANES.map((l) => `${l} [${LANE_GATES[l].join(" ")}]`).join(" · ")}
Docs: https://github.com/AnshRoshan/aisdlc`);
  },
};

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const cmd = args._.shift() || "help";
  if (args.flags.version || args.flags.v) return commands.version();
  if (args.flags.help) return commands.help();
  const fn = commands[cmd];
  if (!fn) { console.error(bad(`Unknown command "${cmd}"`)); await commands.help(); process.exit(1); }
  const root = args.flags.cwd ? args.flags.cwd : projectRoot();
  try { await fn(args, root); } catch (e) { fail(e.message || String(e)); }
}
