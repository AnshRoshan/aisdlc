// Copies the canonical <repo>/skills into packages/cli/skills so the npm tarball is self-contained.
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..", "..", "skills");
const dest = join(here, "..", "skills");
if (!existsSync(src)) { console.log("no monorepo skills dir; nothing to sync"); process.exit(0); }
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`synced skills → ${dest}`);
