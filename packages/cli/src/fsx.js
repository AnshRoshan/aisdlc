/** Small filesystem helpers and skill-source resolution. */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, cpSync, symlinkSync, rmSync, lstatSync, realpathSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute, sep, delimiter, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const identityPath = (p) => process.platform === "win32" ? p.toLowerCase() : p;

/** Optional historical timestamp; current evidence freshness uses sourceFingerprint instead. */
export function lastCodeChange(root) {
  try {
    return execSync('git log -1 --format=%cI', { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null;
  } catch { return null; }
}

/** Skills ship in the npm package; checkout sources live at the monorepo root. */
export function skillsSourceDir() {
  for (const dir of [join(here, "..", "skills"), join(here, "..", "..", "..", "skills")]) {
    if (existsSync(dir) && readdirSync(dir).some((name) => existsSync(join(dir, name, "SKILL.md")))) return dir;
  }
  throw new Error("aisdlc skills directory not found; reinstall the package.");
}
export function agentsSourceDir() {
  for (const dir of [join(here, "..", "agents"), join(here, "..", "..", "..", "agents")]) {
    if (existsSync(dir) && readdirSync(dir).some((name) => name.endsWith(".md"))) return dir;
  }
  return null;
}
export function listAgents(dir = agentsSourceDir()) {
  return dir ? readdirSync(dir).filter((file) => file.endsWith(".md")).map((file) => ({ file, path: join(dir, file) })) : [];
}
export function listSkills(dir = skillsSourceDir()) {
  return readdirSync(dir).filter((name) => existsSync(join(dir, name, "SKILL.md"))).map((name) => {
    const text = readFileSync(join(dir, name, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    const meta = {};
    if (fm) for (const line of fm[1].split("\n")) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) meta[match[1]] = match[2].trim();
    }
    return { dir: name, name: meta.name || name, description: meta.description || "", path: join(dir, name) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function read(path) { return existsSync(path) ? readFileSync(path, "utf8") : ""; }
export function readJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw new Error(`Cannot read JSON ${path}: ${error.message}`);
  }
}
export function write(path, content) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }
export function writeIfMissing(path, content) { if (existsSync(path)) return false; write(path, content); return true; }
export function ensureDir(path) { mkdirSync(path, { recursive: true }); }

/** Include tracked and non-ignored source, uncommitted changes, Markdown output and deletions.
 * Exclude only per-feature process artifacts, the marker and installed harness instructions/skills.
 */
export function sourceFingerprint(root, featuresDir = "docs/features") {
  const hash = createHash("sha256");
  const featurePrefix = relative(root, resolve(root, featuresDir)).replace(/\\/g, "/") + "/";
  for (const file of [...new Set(repoFiles(root))].sort()) {
    const name = relative(root, file).replace(/\\/g, "/");
    if (name.startsWith(featurePrefix) || name === "aisdlc.json" || /^(?:\.agents|\.claude|\.cursor|\.gemini|\.windsurf|\.opencode)\//.test(name)) continue;
    let bytes;
    try { if (!statSync(file).isFile()) continue; bytes = readFileSync(file); }
    catch (error) { if (error.code === "ENOENT") bytes = Buffer.from("<deleted>"); else throw error; }
    hash.update(JSON.stringify([name, bytes.length]));
    hash.update(bytes);
  }
  return hash.digest("hex");
}

function physicalPath(path) {
  try { return realpathSync(path); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    const parent = dirname(path);
    return parent === path ? path : join(physicalPath(parent), basename(path));
  }
}
function contains(from, to) {
  const rel = relative(from, to);
  return !isAbsolute(rel) && rel !== ".." && !rel.startsWith(".." + sep);
}
function linkExists(path) { try { lstatSync(path); return true; } catch { return false; } }

/** Preserve extra user files; never delete a source through a physical alias. */
export function copyOrLink(src, dest, link) {
  const source = resolve(src), target = resolve(dest);
  if (identityPath(source) === identityPath(target)) return;
  const realSource = physicalPath(source), realTarget = physicalPath(target);
  if (identityPath(realSource) === identityPath(realTarget)) return;
  if (contains(source, target) || contains(target, source) || contains(realSource, realTarget) || contains(realTarget, realSource)) throw new Error("Skill source and destination must not contain each other.");
  mkdirSync(dirname(target), { recursive: true });
  const present = linkExists(target);
  if (link) {
    if (present && !lstatSync(target).isSymbolicLink()) throw new Error(`Refusing to replace existing directory ${target} with a symlink; use copy mode`);
    if (present) rmSync(target, { force: true }); // Target checked: remove a symlink, not its source.
    symlinkSync(process.platform === "win32" ? source : relative(dirname(target), source), target, process.platform === "win32" ? "junction" : "dir");
  } else {
    if (present && lstatSync(target).isSymbolicLink()) rmSync(target, { force: true });
    cpSync(source, target, { recursive: true });
  }
}

/** Insert or replace a marked block in a file (idempotent). */
export function upsertBlock(file, block, start, end, header = "") {
  const current = read(file);
  if (current.includes(start) && current.includes(end)) {
    const next = current.slice(0, current.indexOf(start)) + block + current.slice(current.indexOf(end) + end.length);
    if (next !== current) write(file, next);
    return next !== current ? "updated" : "unchanged";
  }
  write(file, (current ? current.replace(/\s*$/, "\n\n") : header) + block + "\n");
  return current ? "appended" : "created";
}
export function slugify(value) {
  return String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "feature";
}

/** Invoke standard Windows Node shims through Node, never shell-concatenate argv. */
export function commandInvocation(argv, { platform = process.platform, pathDirs = (process.env.PATH || "").split(delimiter), node = process.execPath } = {}) {
  if (platform !== "win32") return argv;
  const command = argv[0], name = basename(command).replace(/\.(?:cmd|bat)$/i, "").toLowerCase();
  const dirs = /[/\\]/.test(command) ? [dirname(resolve(command))] : pathDirs;
  if (!/\.(?:cmd|bat)$/i.test(command) && dirs.some((dir) => existsSync(join(dir, name + ".exe")))) return argv;
  const scripts = {
    npm: ["node_modules/npm/bin/npm-cli.js"], npx: ["node_modules/npm/bin/npx-cli.js"],
    pnpm: ["node_modules/pnpm/bin/pnpm.cjs", "node_modules/corepack/dist/pnpm.js"],
    yarn: ["node_modules/yarn/bin/yarn.js", "node_modules/corepack/dist/yarn.js"],
  }[name];
  if (scripts) for (const dir of dirs) for (const script of scripts) {
    const file = join(dir, script);
    if (existsSync(file)) return [node, file, ...argv.slice(1)];
  }
  if (scripts || /\.(?:cmd|bat)$/i.test(command)) throw new Error(`Cannot resolve ${command} without a shell; invoke its JS entry point with node explicitly`);
  return argv;
}
export function gitUser(root) {
  try { return execSync("git config user.name", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || null; }
  catch { return null; }
}

/** Git supplies tracked + non-ignored files; no-Git fallback skips generated directories.
 * Never silently truncate deep source trees or follow directory symlinks.
 */
export function repoFiles(root) {
  try {
    const out = execSync("git ls-files -z --cached --others --exclude-standard", { cwd: root, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 }).toString();
    return out.split("\0").filter(Boolean).map((file) => join(root, file));
  } catch {
    const out = [], skip = new Set(["node_modules", ".git", ".next", ".astro", "dist", "build", "coverage", ".turbo"]);
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile() || (entry.isSymbolicLink() && statSync(path).isFile())) out.push(path);
      }
    };
    walk(root);
    return out;
  }
}
export function isTextFile(path) {
  if (/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|woff2?|ttf|otf|mp4|mp3|lock)$/i.test(path)) return false;
  try { return statSync(path).size < 2 * 1024 * 1024; } catch { return false; }
}
export function projectRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "aisdlc.json")) || existsSync(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}
