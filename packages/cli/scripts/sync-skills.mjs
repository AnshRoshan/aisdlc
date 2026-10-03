// Copies the canonical <repo>/skills into packages/cli/skills so the npm tarball is self-contained.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");
for (const [name, dest] of [["skills", join(here, "..", "skills")], ["agents", join(here, "..", "agents")]]) {
  const src = join(repo, name);
  if (!existsSync(src)) { console.log(`no ${name} dir in the checkout; nothing to sync`); continue; }
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`synced ${name} → ${dest}`);
}
