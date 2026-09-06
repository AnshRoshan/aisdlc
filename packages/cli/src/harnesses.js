/**
 * Harness registry: where each coding agent looks for skills and its instructions file.
 * Skills follow the open Agent Skills format (SKILL.md with name/description frontmatter).
 * The canonical copy always goes to .agents/skills/ (read natively by Codex and others);
 * per-harness directories get a copy (or symlink with --link) so discovery is zero-config.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

export const HARNESSES = {
  "claude-code": {
    label: "Claude Code",
    skillsDir: ".claude/skills",
    instructions: "CLAUDE.md",
    commandsDir: ".claude/commands",
    commandExt: ".md",
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
    instructions: ".cursor/rules/aisdlc.mdc",
    instructionsHeader: "---\ndescription: aisdlc process rules (spec → gates → evidence)\nalwaysApply: true\n---\n",
    detect: [".cursor"],
  },
  "gemini-cli": {
    label: "Gemini CLI",
    skillsDir: ".gemini/skills",
    instructions: "GEMINI.md",
    commandsDir: ".gemini/commands",
    commandExt: ".toml",
    detect: [".gemini", "GEMINI.md"],
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
    label: "Windsurf",
    skillsDir: ".windsurf/skills",
    instructions: ".windsurf/rules/aisdlc.md",
    detect: [".windsurf"],
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
 * Companion skills: maintained third-party skills that aisdlc bridges to.
 * aisdlc works without them (each bridge skill embeds a fallback), but the official ones are updated upstream.
 */
export const COMPANIONS = {
  ponytail: {
    about: "lazy-senior-dev minimalism: YAGNI ladder, stdlib/platform before deps, shortest working diff (DietrichGebert/ponytail)",
    bridge: "aisdlc-ponytail",
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
    bridge: "aisdlc-grill",
    install: "npx skills@latest add mattpocock/skills --skill grilling",
    alternatives: [
      "Claude Code:  claude plugins install mattpocock-skills   (or /plugin install mattpocock-skills)",
      "Any agent:    npx skills@latest add mattpocock/skills   then pick grilling (and grill-me)",
    ],
    dirs: ["grilling", "grill-me"],
  },
  "code-craft": {
    about: "line-level clean-code craft: the ladder before writing, smell-fix on touched lines, dead-code deletion with dynamic-reference checks (AnshRoshan/ansh-other-skills)",
    bridge: "aisdlc-craft",
    install: "npx skills@latest add AnshRoshan/ansh-other-skills --skill code-craft",
    alternatives: [
      "Claude Code:  /plugin marketplace add AnshRoshan/ansh-other-skills   then   /plugin install ansh-other-skills@ansh-other-skills",
      "Any agent:    npx skills@latest add AnshRoshan/ansh-other-skills   then pick code-craft (and code-quality-tools)",
    ],
    dirs: ["code-craft"],
  },
  "quality-tools": {
    about: "the lint/dead-code/complexity/security CLI runner: which tool, safe order, what mutates vs detects (AnshRoshan/ansh-other-skills)",
    bridge: "aisdlc-quality",
    install: "npx skills@latest add AnshRoshan/ansh-other-skills --skill code-quality-tools",
    alternatives: [
      "Claude Code:  /plugin marketplace add AnshRoshan/ansh-other-skills   then   /plugin install ansh-other-skills@ansh-other-skills",
      "Any agent:    npx skills@latest add AnshRoshan/ansh-other-skills   then pick code-quality-tools",
    ],
    dirs: ["code-quality-tools"],
  },
};

const SKILL_ROOTS = [".agents/skills", ".claude/skills", ".cursor/skills", ".gemini/skills", ".github/skills", ".windsurf/skills", ".opencode/skills", ".codex/skills"];

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
