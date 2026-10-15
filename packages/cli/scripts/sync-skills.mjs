// Sync canonical skills, agents and MIT attribution into the self-contained npm package.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..", "..");
const pkg = resolve(here, "..");
for (const name of ["skills", "agents", "LICENSE"]) {
  const src = join(repo, name), dest = join(pkg, name);
  if (!existsSync(src)) { console.log(`no ${name} in the checkout; leaving packaged copy intact`); continue; }
  const inside = relative(pkg, dest);
  if (src === dest || !inside || isAbsolute(inside) || inside.startsWith("..")) throw new Error("Unsafe package sync target");
  // Absolute fixed child target verified above; never remove the canonical source.
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`synced ${name} → ${dest}`);
}
