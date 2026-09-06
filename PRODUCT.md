# PRODUCT.md — aisdlc

## What it is
aisdlc is an open-source (MIT) process kit for AI-assisted engineering: 18 Agent Skills plus a zero-dependency Node CLI. It enforces a spec-driven process — EARS specs, six evidence gates (G1–G6), hash-bound human approvals, recorded evidence runs — so "the agent said it's done" becomes an auditable claim. Local-first: no server, no account, no telemetry.

## Audience
Developers already using AI coding harnesses (Claude Code, Codex CLI, Cursor, Gemini CLI, Copilot, Windsurf, OpenCode) who are burned by fake-green agent claims: tests that never ran, specs quietly rewritten, agents approving their own plans. Technical, skeptical, allergic to ceremony and marketing fluff.

## Success of the site
A skeptical developer lands, understands within seconds that this is *enforcement, not templates* (unlike Spec Kit/BMAD), and runs `npx aisdlc-cli init` in a repo they are already working on. Secondary: browse the 18 skills, read the ten-minute tour, star the repo.

## Voice
Terse, declarative, a little wry ("the author tried to approve their own plan; the tool said no"). Claims come from the product's actual behavior. No superlatives, no exclamation marks.

## Modes per surface
- Landing (`/`): **Persuade** — earn attention and action.
- Skills index + detail (`/skills`, `/skills/[slug]`): **Read** — scan, compare, install.
- Docs tour (`/docs`): **Read** — ten-minute comprehension path.
