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

import { marked } from "marked";

// Skill bodies are full of placeholders like <slug> and <feature>. marked passes raw HTML through
// by default, so an unescaped <title> would vanish into an unknown element. Neutralise it at the
// renderer instead of pre-escaping the source: pre-escaping makes marked escape the ampersand a
// second time and the page then shows "&lt;slug&gt;".
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
marked.use({
  renderer: {
    html(token) {
      return escapeHtml(typeof token === "string" ? token : (token?.text ?? ""));
    },
  },
});

const anchorId = (s) => s.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

export function renderMarkdown(md) {
  // The skill files are the product's canonical prose and stay as written; the *page* is a
  // rendering surface, and typographic dashes read as AI copy there. Same call clean() makes
  // for descriptions.
  const body = (md || "").replace(/\s*[—–]\s*/g, " - ");
  return marked
    .parse(body, { gfm: true })
    .replace(/<h([23])>(.*?)<\/h\1>/g, (_, n, inner) => `<h${n} id="${anchorId(inner)}">${inner}</h${n}>`);
}

// Heading text arrives already entity-encoded from the renderer; the rail re-encodes it once,
// so decode first or "&lt;" shows up literally in the navigation.
const decodeEntities = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export function outline(html) {
  return [...html.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)].map(([, id, text]) => ({ id, text: decodeEntities(text.replace(/<[^>]+>/g, "")) }));
}

export function getSkills() {
  return readdirSync(SKILLS_DIR)
    .filter((d) => d.startsWith("aisdlc-"))
    .map((dir) => {
      const raw = readFileSync(path.join(SKILLS_DIR, dir, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
      const fm = raw.slice(raw.indexOf("---") + 3, raw.indexOf("---", 3));
      const name = dir;
      const description = clean((fm.match(/^description:\s*(.+)$/m)?.[1] ?? "").trim());
      // stage is nested under metadata:, so it is indented in the frontmatter
      const stage = fm.match(/^\s+stage:\s*(.+)$/m)?.[1]?.trim() ?? "any";
      const body = raw.slice(raw.indexOf("---", 3) + 3).replace(/^\s*#\s+.+\n/, "").trim();
      return { name, description, stage, body, html: renderMarkdown(body) };
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
