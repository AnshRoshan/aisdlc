/**
 * Harness registry: where each coding agent looks for skills and its instructions file.
 * Skills follow the open Agent Skills format (SKILL.md with name/description frontmatter).
 * The canonical copy always goes to .agents/skills/ (read natively by Codex and others);
 * per-harness directories get a copy (or symlink with --link) so discovery is zero-config.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const HARNESSES = {
  "claude-code": {
    label: "Claude Code",
    skillsDir: ".claude/skills",
    instructions: "CLAUDE.md",
    commandsDir: ".claude/commands",
    commandExt: ".md",
    agentsDir: ".claude/agents",
    detect: [".claude", "CLAUDE.md"],
  },
  codex: {
    label: "OpenAI Codex CLI",
    skillsDir: ".agents/skills",
    instructions: "AGENTS.md",
    detect: [".codex", "AGENTS.md"],
  },
  cursor: {
    label: "Cursor",
    skillsDir: ".cursor/skills",
    instructions: ".cursor/rules/arsdlc.mdc",
    instructionsHeader: "---\ndescription: arsdlc process rules (spec → gates → evidence)\nalwaysApply: true\n---\n",
    detect: [".cursor"],
  },
  antigravity: {
    label: "Google Antigravity CLI",
    skillsDir: ".agents/skills",
    instructions: "AGENTS.md",
    detect: [".antigravity"],
    note: "Antigravity replaced Gemini CLI on 2026-06-18 and reads the .agents/skills layout; a .gemini/skills install still loads as an Antigravity plugin.",
  },
  devin: {
    label: "Devin Desktop",
    skillsDir: ".devin/skills",
    instructions: ".devin/rules/arsdlc.md",
    detect: [".devin"],
    note: "Devin Desktop replaced Windsurf on 2026-06-02; .windsurf/ remains the legacy layout.",
  },
  "gemini-cli": {
    label: "Gemini CLI (legacy)",
    skillsDir: ".gemini/skills",
    instructions: "GEMINI.md",
    commandsDir: ".gemini/commands",
    commandExt: ".toml",
    detect: [".gemini", "GEMINI.md"],
    retired: "Gemini CLI stopped serving requests on 2026-06-18 and became Antigravity CLI. The .gemini layout still loads as an Antigravity plugin; prefer --harness antigravity.",
  },
  copilot: {
    label: "GitHub Copilot",
    skillsDir: ".github/skills",
    instructions: ".github/copilot-instructions.md",
    commandsDir: ".github/prompts",
    commandExt: ".prompt.md",
    detect: [".github/copilot-instructions.md", ".github/prompts"],
  },
  windsurf: {
    label: "Windsurf (legacy)",
    skillsDir: ".windsurf/skills",
    instructions: ".windsurf/rules/arsdlc.md",
    detect: [".windsurf"],
    retired: "Windsurf became Devin Desktop on 2026-06-02. .windsurf/ still resolves; prefer --harness devin for new installs.",
  },
  opencode: {
    label: "OpenCode",
    skillsDir: ".opencode/skills",
    instructions: "AGENTS.md",
    detect: [".opencode", "opencode.json"],
  },
  universal: {
    label: "Any agent (.agents/skills + AGENTS.md)",
    skillsDir: ".agents/skills",
    instructions: "AGENTS.md",
    detect: [".agents"],
  },
};

export const HARNESS_IDS = Object.keys(HARNESSES);

export function detectHarnesses(root) {
  const found = [];
  for (const [id, h] of Object.entries(HARNESSES)) {
    if (id === "universal") continue;
    if (h.detect.some((p) => existsSync(join(root, p)))) found.push(id);
  }
  return found;
}

export function resolveHarnessList(input, root) {
  if (!input || input === "auto") {
    const d = detectHarnesses(root);
    return d.length ? [...new Set(["universal", ...d])] : ["universal", "claude-code", "codex"];
  }
  if (input === "all" || input === "*") return HARNESS_IDS;
  const list = String(input).split(",").map((s) => s.trim()).filter(Boolean);
  for (const id of list) if (!HARNESSES[id]) throw new Error(`Unknown harness "${id}". Known: ${HARNESS_IDS.join(", ")}`);
  return [...new Set(["universal", ...list])];
}

/**
 * Companion skills: maintained third-party skills that arsdlc bridges to.
 * arsdlc works without them (each bridge skill embeds a fallback), but the official ones are updated upstream.
 */
export const COMPANIONS = {
  ponytail: {
    about: "lazy-senior-dev minimalism: YAGNI ladder, stdlib/platform before deps, shortest working diff (DietrichGebert/ponytail)",
    bridge: "arsdlc-ponytail",
    install: "npx skills@latest add DietrichGebert/ponytail --skill ponytail",
    alternatives: [
      "Claude Code:  /plugin marketplace add DietrichGebert/ponytail   then   /plugin install ponytail@ponytail",
      "Codex:        codex plugin marketplace add DietrichGebert/ponytail && codex plugin add ponytail@ponytail",
      "Copilot CLI:  copilot plugin marketplace add DietrichGebert/ponytail && copilot plugin install ponytail@ponytail",
      "Gemini CLI:   gemini extensions install https://github.com/DietrichGebert/ponytail",
      "OpenCode:     add \"@dietrichgebert/ponytail\" to the plugin list in opencode.json",
    ],
    dirs: ["ponytail"],
  },
  grilling: {
    about: "the relentless-interview primitive behind /grill-me: frontier rounds with recommended answers (mattpocock/skills)",
    bridge: "arsdlc-grill",
    install: "npx skills@latest add mattpocock/skills --skill grilling",
    alternatives: [
      "Claude Code:  claude plugins install mattpocock-skills   (or /plugin install mattpocock-skills)",
      "Any agent:    npx skills@latest add mattpocock/skills   then pick grilling (and grill-me)",
    ],
    dirs: ["grilling", "grill-me"],
  },
  "code-craft": {
    about: "line-level clean-code craft: the ladder before writing, smell-fix on touched lines, dead-code deletion with dynamic-reference checks (AnshRoshan/ansh-other-skills)",
    bridge: "arsdlc-craft",
    install: "npx skills@latest add AnshRoshan/ansh-other-skills --skill code-craft",
    alternatives: [
      "Claude Code:  /plugin marketplace add AnshRoshan/ansh-other-skills   then   /plugin install ansh-other-skills@ansh-other-skills",
      "Any agent:    npx skills@latest add AnshRoshan/ansh-other-skills   then pick code-craft (and code-quality-tools)",
    ],
    dirs: ["code-craft"],
  },
  "quality-tools": {
    about: "the lint/dead-code/complexity/security CLI runner: which tool, safe order, what mutates vs detects (AnshRoshan/ansh-other-skills)",
    bridge: "arsdlc-quality",
    install: "npx skills@latest add AnshRoshan/ansh-other-skills --skill code-quality-tools",
    alternatives: [
      "Claude Code:  /plugin marketplace add AnshRoshan/ansh-other-skills   then   /plugin install ansh-other-skills@ansh-other-skills",
      "Any agent:    npx skills@latest add AnshRoshan/ansh-other-skills   then pick code-quality-tools",
    ],
    dirs: ["code-quality-tools"],
  },
};

const SKILL_ROOTS = [".agents/skills", ".claude/skills", ".cursor/skills", ".gemini/skills", ".github/skills", ".windsurf/skills", ".opencode/skills", ".codex/skills", ".devin/skills"];

/** A companion counts as installed when its SKILL.md is in any harness skills dir or a plugin marker exists. */
export function detectCompanions(root) {
  const found = [];
  for (const [id, cpn] of Object.entries(COMPANIONS)) {
    const hit = SKILL_ROOTS.some((r) => cpn.dirs.some((d) => existsSync(join(root, r, d, "SKILL.md")))) ||
      (id === "ponytail" && (existsSync(join(root, ".cursor/rules/ponytail.mdc")) || existsSync(join(root, ".windsurf/rules/ponytail.md")) || existsSync(join(root, ".clinerules/ponytail.md"))));
    if (hit) found.push(id);
  }
  return found;
}

/**
 * What actually enforces the gates on this project, per harness, judged only by files that exist.
 * `native` needs a guard module this project can point at; `ci` needs the gate workflow; anything
 * else is `none`. Reporting a capability as an enforcement level is how a kit starts claiming
 * protection it does not provide.
 */
export function enforcement(root, { exists = (p) => existsSync(join(root, p)), text = (p) => { try { return readFileSync(join(root, p), "utf8"); } catch { return ""; } } } = {}) {
  const gateWorkflow = exists(".github/workflows/gates.yml") || exists(".github/workflows/gates.yaml");
  const repoGuard = exists("hooks/arsdlc-guard.mjs") && exists("hooks/hooks.json");
  const installedGuard = text(".claude/settings.json").includes("arsdlc-guard") || text(".claude/settings.local.json").includes("arsdlc-guard");
  return HARNESS_IDS.map((id) => {
    const h = HARNESSES[id];
    const native = id === "claude-code" && (repoGuard || installedGuard);
    const level = native ? "native" : gateWorkflow ? "ci" : "none";
    const reason = native
      ? repoGuard ? "arsdlc-guard.mjs is in this project and registers on tool.call" : "a project hook registers arsdlc-guard"
      : id === "claude-code"
        ? "the guard ships with the arsdlc plugin, but nothing in this project proves it is loaded"
        : `no verified hook adapter for ${h.label}; hooks are tracked as an open assumption`;
    return { id, label: h.label, enforcement: level, reason, install: `npx @anshroshan/arsdlc init --harness ${id}`, retired: h.retired || null };
  });
}
