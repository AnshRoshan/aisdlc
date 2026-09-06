import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// skills/ lives one level above site/ in the monorepo; read it at build time.
// In dev this module resolves from src/lib; in build it is bundled into dist,
// so resolve from the project root and fall back to the module location.
function skillsDir() {
  const fromCwd = path.resolve(process.cwd(), "../skills");
  if (readdirSyncSafe(fromCwd)) return fromCwd;
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../skills");
}
function readdirSyncSafe(dir) {
  try {
    readdirSync(dir);
    return true;
  } catch {
    return false;
  }
}
const SKILLS_DIR = skillsDir();

export function getSkills() {
  return readdirSync(SKILLS_DIR)
    .filter((d) => d.startsWith("aisdlc-"))
    .map((dir) => {
      const raw = readFileSync(path.join(SKILLS_DIR, dir, "SKILL.md"), "utf8");
      const fm = raw.slice(raw.indexOf("---") + 3, raw.indexOf("---", 3));
      const name = dir;
      const description = clean((fm.match(/^description:\s*(.+)$/m)?.[1] ?? "").trim());
      // stage is nested under metadata:, so it is indented in the frontmatter
      const stage = fm.match(/^\s+stage:\s*(.+)$/m)?.[1]?.trim() ?? "any";
      return { name, description, stage };
    });
}

// First sentence of the frontmatter description, for card previews.
export function shortDesc(description) {
  const s = description.split(/(?<=\.)\s/)[0] ?? description;
  return s.length > 180 ? s.slice(0, 177) + "…" : s;
}

// Descriptions come from SKILL.md frontmatter and may contain em-dashes or
// middle-dot chains, which the design system bans on the page.
export function clean(text) {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/(?:\s*·\s*){2,}/g, ", ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/,\s*,/g, ",");
}

export const skillSlug = (name) => name.replace(/^aisdlc-/, "");
