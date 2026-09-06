/** Small filesystem helpers and skill-source resolution. */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, cpSync, symlinkSync, rmSync, lstatSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));

/** Skills ship inside the package (packages/cli/skills). In the monorepo checkout they live at <repo>/skills. */
export function skillsSourceDir() {
  const candidates = [join(here, "..", "skills"), join(here, "..", "..", "..", "skills")];
  for (const c of candidates) if (existsSync(c) && readdirSync(c).some((d) => existsSync(join(c, d, "SKILL.md")))) return c;
  throw new Error("aisdlc skills directory not found; reinstall the package.");
}

export function listSkills(dir = skillsSourceDir()) {
  return readdirSync(dir)
    .filter((d) => existsSync(join(dir, d, "SKILL.md")))
    .map((d) => {
      const text = readFileSync(join(dir, d, "SKILL.md"), "utf8");
      const fm = text.match(/^---\n([\s\S]*?)\n---/);
      const meta = {};
      if (fm) for (const line of fm[1].split("\n")) { const m = line.match(/^(\w+):\s*(.*)$/); if (m) meta[m[1]] = m[2].trim(); }
      return { dir: d, name: meta.name || d, description: meta.description || "", path: join(dir, d) };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function read(p) { return existsSync(p) ? readFileSync(p, "utf8") : ""; }
export function readJson(p, fallback) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; } }
export function write(p, content) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, content); }
export function writeIfMissing(p, content) { if (existsSync(p)) return false; write(p, content); return true; }
export function ensureDir(p) { mkdirSync(p, { recursive: true }); }

export function copyOrLink(src, dest, link) {
  mkdirSync(dirname(dest), { recursive: true });
  if (existsSync(dest) || isBrokenLink(dest)) rmSync(dest, { recursive: true, force: true });
  if (link) symlinkSync(relative(dirname(dest), src), dest, "dir");
  else cpSync(src, dest, { recursive: true });
}
function isBrokenLink(p) { try { lstatSync(p); return true; } catch { return false; } }

/** Insert or replace a marked block in a file (idempotent). */
export function upsertBlock(file, block, start, end, header = "") {
  const cur = read(file);
  if (cur.includes(start) && cur.includes(end)) {
    const next = cur.slice(0, cur.indexOf(start)) + block + cur.slice(cur.indexOf(end) + end.length);
    if (next !== cur) write(file, next);
    return next !== cur ? "updated" : "unchanged";
  }
  write(file, (cur ? cur.replace(/\s*$/, "\n\n") : header) + block + "\n");
  return cur ? "appended" : "created";
}

export function slugify(s) {
  return String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "feature";
}

export function gitUser(root) {
  try { return execSync("git config user.name", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null; } catch { return null; }
}

/** Files to scan: tracked git files when possible, otherwise a bounded walk. */
export function repoFiles(root) {
  try {
    const out = execSync("git ls-files -z --cached --others --exclude-standard", { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).toString();
    return out.split("\0").filter(Boolean).map((f) => join(root, f));
  } catch {
    const out = [];
    const skip = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage", ".turbo"]);
    const walk = (d, depth) => {
      if (depth > 8) return;
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p, depth + 1);
        else if (e.isFile()) out.push(p);
      }
    };
    walk(root, 0);
    return out;
  }
}

export function isTextFile(p) {
  if (/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|woff2?|ttf|otf|mp4|mp3|lock)$/i.test(p)) return false;
  try { return statSync(p).size < 2 * 1024 * 1024; } catch { return false; }
}

export function projectRoot(start = process.cwd()) {
  let d = resolve(start);
  for (;;) {
    if (existsSync(join(d, "aisdlc.json")) || existsSync(join(d, ".git"))) return d;
    const parent = dirname(d);
    if (parent === d) return resolve(start);
    d = parent;
  }
}
