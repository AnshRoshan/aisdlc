@AGENTS.md

# CLAUDE.md

The `@AGENTS.md` import above loads the master instruction file at launch. Keep this file a thin wrapper; duplicated rules drift.

Personal, uncommitted overrides go in `CLAUDE.local.md` (gitignored, loaded after this file).

This repo is also an arsdlc project. Before any engineering task, run `node packages/cli/bin/arsdlc.js next <feature>` and trust the disk over chat.
