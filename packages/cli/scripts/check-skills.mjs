#!/usr/bin/env node
/**
 * Skill-corpus validator. Zero dependencies, stdlib only. Run: node scripts/check-skills.mjs
 *
 * The skills are the product, so the product needs a test. This checks the claims the
 * skills and docs make about the tool, which is exactly the class of defect that prose
 * reviews miss: a command that was never implemented, a reference to a skill that does not
 * exist, a sub-file that was never written, a doc count that drifted.
 *
 * Rules
 *  1  every skills/<dir>/SKILL.md exists, parses, and its frontmatter is complete and uniform
 *  2  `name:` equals the directory name; dir matches aisdlc-<word>
 *  3  description length: hard cap 1024, warn at 400 (every installed description loads into every session)
 *  4  every `aisdlc-*` token in the corpus names a skill that exists (or an allowlisted non-skill)
 *  5  every CLI verb documented anywhere is a real command in src/cli.js
 *  6  every `references|x|modes/<file>.md` a skill tells the agent to read exists in that skill folder
 *  7  portability: no hardcoded model alias in spawn prose, no naming one agent's subagent tool,
 *     no shell glue that dies on PowerShell
 *  8  byte budget per file, and a budget per *hot path* (what a real run actually loads)
 *  9  every relative markdown link target in the corpus exists on disk
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..", "..");
const SKILLS = join(root, "skills");
const LF = (s) => (s || "").replace(/\r\n/g, "\n");
const rel = (p) => relative(root, p).replace(/\\/g, "/");

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const wrn = (where, msg) => warnings.push(`${where}: ${msg}`);

/* ───────────── the truth this file checks prose against ───────────── */

function cliCommands() {
  const src = LF(readFileSync(join(root, "packages/cli/src/cli.js"), "utf8"));
  const start = src.indexOf("const commands = {");
  const end = src.indexOf("\nexport async function main", start);
  const block = src.slice(start, end);
  const names = new Set();
  for (const m of block.matchAll(/^\s{2}async (\w+)\(/gm)) names.add(m[1]);
  return names;
}

function companionIds() {
  const src = LF(readFileSync(join(root, "packages/cli/src/harnesses.js"), "utf8"));
  const block = src.slice(src.indexOf("export const COMPANIONS"), src.indexOf("\n}", src.indexOf("export const COMPANIONS")));
  return new Set([...block.matchAll(/^\s{2}(\w[\w-]*):/gm)].map((m) => m[1]));
}

const CMDS = cliCommands();
const COMPANIONS = companionIds();
// `check` takes a noun; gates and lanes and kinds are positional args that follow a real verb.
const CMD_NOUNS = new Set(["spec", "delta", "all", "json", "auto", "harness", "lane", "link", "label", "kind", "by", "note", "force", "cwd", "task", "skill"]);
const NON_SKILL_TOKENS = new Map([
  ["aisdlc-cli", "the npm package name, not a skill"],
  ["aisdlc-site", "the Astro site package name"],
  ["aisdlc-json", "the project marker file (aisdlc.json)"],
  ["aisdlc-specific", "prose: the phrase 'not aisdlc-specific', not a skill name"],
  ["aisdlc-mcp", "roadmap item named in docs/RESEARCH.md, not a shipped skill"],
]);

// Claude Code slash commands are aisdlc-<verb> too, and they are real files, not skills.
function slashCommands() {
  const dir = join(root, "commands");
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")));
}
const SLASH = slashCommands();
for (const s of SLASH) NON_SKILL_TOKENS.set(s, `the Claude Code slash command commands/${s}.md`);

// Read-only subagent definitions are aisdlc-<role> too.
const AGENT_DIR = join(root, "agents");
const AGENTS = existsSync(AGENT_DIR) ? readdirSync(AGENT_DIR).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")) : [];
for (const a of AGENTS) NON_SKILL_TOKENS.set(a, `the read-only subagent agents/${a}.md`);

for (const a of AGENTS) {
  const text = LF(readFileSync(join(AGENT_DIR, `${a}.md`), "utf8"));
  const fm = frontmatter(text);
  if (!fm) { err(`agents/${a}.md`, "no frontmatter"); continue; }
  const field = (k) => (fm.match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1]?.trim();
  if (field("name") !== a) err(`agents/${a}.md`, `name: "${field("name")}" != file name`);
  for (const k of ["description", "model", "tools"]) if (!field(k)) err(`agents/${a}.md`, `frontmatter has no ${k}: - the pin only works if it is declared here`);
  if (field("tools") && /\bEdit\b/.test(field("tools"))) err(`agents/${a}.md`, "a scout/researcher is read-only; granting Edit makes it a second writer of the code");
  if (!/\b(haiku|sonnet|opus|fable|inherit)\b/.test(field("model") || "")) wrn(`agents/${a}.md`, `model: "${field("model")}" is not a Claude Code alias - check it resolves`);
  for (const [re, why] of [[/You (?:may|can) (?:edit|write files)/i, "contradicts the read-only role"]]) {
    if (re.test(text)) err(`agents/${a}.md`, why);
  }
}

const KB = 1024;
const BUDGET = { "SKILL.md": 13 * KB, subfile: 9 * KB };
const WARN_AT = 0.9;
// A path budget sums the files a real run loads: every `required` file plus the largest
// alternative in `oneOf`. Budgeting the sum is the only number that reflects the cost.
const HOT_PATHS = [
  { name: "route a task (any run)", required: ["skills/aisdlc-flow/SKILL.md"], oneOf: [] },
  {
    name: "route + one stage",
    required: ["skills/aisdlc-flow/SKILL.md"],
    oneOf: [
      "skills/aisdlc-discover/SKILL.md",
      "skills/aisdlc-spec/SKILL.md",
      "skills/aisdlc-plan/SKILL.md",
      "skills/aisdlc-tasks/SKILL.md",
      "skills/aisdlc-implement/SKILL.md",
      "skills/aisdlc-verify/SKILL.md",
      "skills/aisdlc-review/SKILL.md",
      "skills/aisdlc-release/SKILL.md",
    ],
  },
  { name: "brownfield repo entry", required: ["skills/aisdlc-flow/SKILL.md", "skills/aisdlc-brownfield/SKILL.md"], oneOf: [] },
  // The split-off branches: they only cost when taken, which is the whole point of taking them out.
  { name: "route with no CLI", required: ["skills/aisdlc-flow/SKILL.md", "skills/aisdlc-flow/references/manual-derivation.md"], oneOf: [] },
  { name: "review + exit", required: ["skills/aisdlc-review/SKILL.md", "skills/aisdlc-review/references/pushback-and-exit.md"], oneOf: [] },
];
const HOT_BUDGET = {
  "route a task (any run)": 12 * KB,
  "route + one stage": 24 * KB,
  "brownfield repo entry": 18 * KB,
  "route with no CLI": 13 * KB,
  "review + exit": 14 * KB,
};

/* ───────────── corpus files ───────────── */

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const mdFiles = [
  ...walk(SKILLS).filter((p) => p.endsWith(".md")),
  ...walk(join(root, "docs")).filter((p) => p.endsWith(".md")),
  ...walk(join(root, "commands")).filter((p) => p.endsWith(".md")),
  ...["README.md", "CHANGELOG.md", "CONTRIBUTING.md", "DESIGN.md", "PRODUCT.md"].map((f) => join(root, f)),
  join(root, "packages/cli/README.md"),
].filter((p) => existsSync(p));

const astroFiles = existsSync(join(root, "site/src")) ? walk(join(root, "site/src")).filter((p) => /\.(astro|js)$/.test(p)) : [];

/* ───────────── rules 1-3: structure and frontmatter ───────────── */

function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

const skillDirs = readdirSync(SKILLS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const skillNames = new Set();

for (const dir of skillDirs) {
  const path = join(SKILLS, dir, "SKILL.md");
  if (!existsSync(path)) {
    err(rel(join(SKILLS, dir)), "skill folder has no SKILL.md");
    continue;
  }
  if (!/^aisdlc-[a-z]+$/.test(dir)) err(rel(path), `folder name "${dir}" is not aisdlc-<word>`);
  const text = LF(readFileSync(path, "utf8"));
  const fm = frontmatter(text);
  if (fm === null) {
    err(rel(path), "no YAML frontmatter block");
    continue;
  }
  const field = (k) => (fm.match(new RegExp(`^${k}:\\s*(.*)$`, "m")) || [])[1]?.trim();
  const name = field("name");
  const desc = field("description");
  if (!name) err(rel(path), "frontmatter has no name:");
  else if (name !== dir) err(rel(path), `name: "${name}" != folder "${dir}"`);
  else skillNames.add(name);
  if (!desc) err(rel(path), "frontmatter has no description:");
  else if (desc.length > 1024) err(rel(path), `description is ${desc.length} chars (Agent Skills format cap 1024)`);
  // 512, not the usual 400: our descriptions carry the user phrases that make a skill fire,
  // which is the discovery surface. The hard 1024 cap is the format's; 512 is the cost line.
  else if (desc.length > 512) wrn(rel(path), `description is ${desc.length} chars; every installed description loads into every session, keep it under 512`);
  for (const req of ["license", "metadata"]) if (!field(req)) err(rel(path), `frontmatter has no ${req}:`);
  if (!/^  stage:\s*\S+/m.test(fm) && !/^  role:\s*\S+/m.test(fm)) err(rel(path), "metadata has neither stage: nor role:");
  if (/^  role:/m.test(fm)) wrn(rel(path), "metadata.role is used nowhere else; use metadata.stage so the site buckets it");

  // rule 8 per file
  const bytes = Buffer.byteLength(text);
  const budget = BUDGET["SKILL.md"];
  if (bytes > budget) err(rel(path), `${bytes} B over the ${budget} B SKILL.md budget - split rarely-needed content into references/`);
  else if (bytes > budget * WARN_AT) wrn(rel(path), `${bytes} B is at ${Math.round((bytes / budget) * 100)}% of budget; prune before adding`);

  // rule 6: sub-files this skill promises to read
  for (const m of text.matchAll(/\b(references|modes|templates|agent-modes)\/([A-Za-z0-9._-]+\.md)/g)) {
    const target = join(SKILLS, dir, m[1], m[2]);
    if (!existsSync(target)) err(rel(path), `tells the agent to read ${m[1]}/${m[2]}, which does not exist`);
  }
}

for (const dir of walk(SKILLS).filter((p) => p.endsWith(".md") && !p.endsWith("SKILL.md"))) {
  const bytes = Buffer.byteLength(LF(readFileSync(dir, "utf8")));
  if (bytes > BUDGET.subfile) err(rel(dir), `${bytes} B over the ${BUDGET.subfile} B sub-file budget`);
  else if (bytes > BUDGET.subfile * WARN_AT) wrn(rel(dir), `${bytes} B is at ${Math.round((bytes / BUDGET.subfile) * 100)}% of the sub-file budget`);
}

/* ───────────── rules 4-7: claims made across the corpus ───────────── */

const claimFiles = [...mdFiles, ...astroFiles];

// Research notes record what used to be wrong, including command names that no longer exist.
// The surfaces a reader acts on - skills, docs, README, site, commands - must never name a command
// the CLI does not have; a history document is allowed to quote one.
const HISTORY = new Set(["docs/RESEARCH.md", "docs/COMPETITORS.md"]);

for (const file of claimFiles) {
  const text = LF(readFileSync(file, "utf8"));
  const where = rel(file);

  // rule 4: skill tokens
  for (const tok of new Set([...text.matchAll(/\baisdlc-[a-z][a-z0-9-]*\b/g)].map((m) => m[0]))) {
    if (skillNames.has(tok)) continue;
    if (NON_SKILL_TOKENS.has(tok)) continue;
    const stem = tok.replace(/-$/, "");
    if (skillNames.has(stem)) continue;
    err(where, `names "${tok}" which is neither a skill, a slash command, nor an allowlisted token`);
  }

  // rule 5: documented CLI verbs, read only from code (prose that starts "aisdlc would…" is not a claim)
  if (!HISTORY.has(where)) {
    const code = [
      ...[...text.matchAll(/```[\s\S]*?```/g)].map((m) => m[0]),
      ...[...text.matchAll(/`[^`\n]*`/g)].map((m) => m[0]),
    ].join("\n");
    const verbs = new Set();
    for (const m of code.matchAll(/npx aisdlc-cli\s+([a-z][a-z-]*)/g)) verbs.add(m[1]);
    for (const m of code.matchAll(/(?:^|[\s$>])aisdlc\s+([a-z][a-z-]*)/gm)) verbs.add(m[1]);
    for (const v of verbs) {
      if (v === "cli") continue;
      if (CMDS.has(v) || CMD_NOUNS.has(v) || COMPANIONS.has(v) || SLASH.has(`aisdlc-${v}`)) continue;
      if (/^g[1-6]$/.test(v)) continue;
      err(where, `documents the command \`aisdlc ${v}\` which does not exist (real: ${[...CMDS].sort().join(", ")})`);
    }
  }

  // rule 7: portability of the prose itself
  const portabilityOnly = file.startsWith(SKILLS) || file.includes("/commands/");
  if (portabilityOnly) {
    for (const [re, why] of [
      [/\bmodel:\s*"?(haiku|sonnet|opus|fable|gpt-[45])"?/gi, "hardcodes one harness's model alias; name the role (a fast, low-cost tier) and pin the alias in the agent definition file, not the skill"],
      [/\b(the )?(Task|Agent) tool\b/gi, "names one client's subagent tool; say 'spawn a subagent' and list the per-client equivalents"],
      [/spawn an (Agent|Subagent)\b/gi, "names one client's spawn verb"],
      [/&gt;\/dev\/null|>\s*\/dev\/null/g, "POSIX-only redirect; dies on PowerShell"],
      [/&&\s*BASE=|\|\|\s*BASE=/g, "POSIX-only shell glue; express base-branch selection as prose"],
    ]) {
      for (const m of text.matchAll(re)) err(where, `portability: ${why} (found "${m[0].trim().slice(0, 40)}")`);
    }
  }

  // rule 9: relative links resolve
  for (const m of text.matchAll(/\]\(([^)\s#]+)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^(https?:|mailto:|data:|#)/.test(target)) continue;
    const abs = resolve(dirname(file), target);
    if (!existsSync(abs)) err(where, `link [..](${target}) points at a file that does not exist`);
  }
}

/* ───────────── rule 8: hot-path budgets ───────────── */

const sizes = new Map();
const sizeOf = (p) => {
  if (!sizes.has(p)) {
    const abs = join(root, p);
    sizes.set(p, existsSync(abs) ? Buffer.byteLength(readFileSync(abs, "utf8")) : 0);
    if (!existsSync(abs)) err("hot path", `${p} is listed in a budget but missing from disk`);
  }
  return sizes.get(p);
};

const pathRows = [];
for (const hp of HOT_PATHS) {
  const base = hp.required.reduce((a, p) => a + sizeOf(p), 0);
  const worst = hp.oneOf.length ? Math.max(...hp.oneOf.map((p) => sizeOf(p))) : 0;
  const total = base + worst;
  const budget = HOT_BUDGET[hp.name];
  if (!budget) err("hot path", `"${hp.name}" has no budget entry`);
  else if (total > budget) err("hot path", `${hp.name}: loads ${total} B, budget ${budget} B - prune, do not raise the ceiling`);
  else if (total > budget * WARN_AT) wrn("hot path", `${hp.name}: ${Math.round((total / budget) * 100)}% of budget - prune before adding`);
  pathRows.push({ name: hp.name, files: hp.required.length + 1, total, budget: budget ?? 0 });
}

/* ───────────── report ───────────── */

const heaviest = [...sizes.entries()].filter(([, b]) => b).sort((a, b) => b[1] - a[1]).slice(0, 8);
const totalSkills = skillNames.size;

if (warnings.length) {
  console.log("\nWarnings (prune before you add):");
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} violation(s) across ${claimFiles.length} files, ${totalSkills} skills`);
  for (const e of errors) console.error(`  x ${e}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${totalSkills} skills, ${claimFiles.length} files, ${CMDS.size} CLI commands cross-checked.\n`);
  console.log("Hot paths (bytes a real run loads):");
  for (const r of pathRows) console.log(`  ${r.name.padEnd(26)} ${String(r.total).padStart(7)} B / ${r.budget} B  ${Math.round((r.total / r.budget) * 100)}%`);
  console.log("\nHeaviest instruction files:");
  for (const [p, b] of heaviest) console.log(`  ${String(b).padStart(6)} B  ${p}`);
  const conv = join(root, "docs/conventions.md");
  if (existsSync(conv)) console.log(`\nAuthoring rules this corpus is checked against: docs/conventions.md (${LF(readFileSync(conv, "utf8")).split("\n").length} lines)`);
}
