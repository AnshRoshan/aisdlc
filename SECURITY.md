# Security

## Reporting a vulnerability

Use **Report a vulnerability** on the [security tab](https://github.com/AnshRoshan/arsdlc/security) —
it opens a private advisory instead of a public issue. Do not open a normal issue for anything
exploitable; the issue tracker is public and this project's own artifacts are specs and evidence logs,
which makes an unreleased defect description a roadmap for whoever wants it.

This is a single-maintainer project with no security team and no paid SLA. What you can expect: an
acknowledgement within about a week, a decision on severity stated in the advisory, and a fix shipped in
a normal tagged release rather than a secret branch. If a fix requires breaking a gate or an on-disk
format, it ships with a migration note in the CHANGELOG. If you receive no response in two weeks, assume
the report was lost and ping the maintainer through any channel that reaches a human.

## Scope

`packages/cli/` (the CLI and its gate engine), `skills/` and `agents/` (the instruction surface),
`hooks/arsdlc-guard.mjs` (the Claude Code guard mod), and the published npm package `arsdlc`.

The CLI has **zero runtime dependencies**, no network calls, no telemetry, no accounts, and **no
install-time scripts** — `prepack` runs when the maintainer packs, never when you install. A vulnerability
that needs the tool to phone home does not exist here, because nothing phones home.

## Documented limits — these are design decisions, not findings

The README states them too. Please read this list before filing; it is the boundary of the threat model,
and it is deliberately narrow because the tool is a local process kit, not a security control:

- **Local files are trusted inputs.** Anyone who can write `docs/features/<feature>/` can edit an artifact
  and recompute its checksum. Hash chains and `arsdlc export --verify` detect accidental tampering and
  partial edits. They are not authenticated authorship; only a real signing key is, which is why `--sign`
  is an external adapter that degrades honestly instead of pretending.
- **`Approved-by` names are not identity.** Segregation of duties stops the agent from approving its own
  work and stops a lone name from satisfying a two-approver lane. It does not prove a human exists.
- **`AISDLC_AGENT=1` is a tripwire, not a wall.** A process that controls the environment can unset it.
- **The guard mod is heuristic and fail-open.** It exists for Claude Code. No other harness currently has
  a confirmed hook that can block a tool call, so `arsdlc doctor` reports the enforcement level per harness
  instead of claiming coverage.
- **`arsdlc scan` is pattern-based.** Nine detector families, placeholder-aware. It catches a key that
  looks like a key; it cannot promise it caught yours.
- **Skill text is instruction, not sandbox.** A prompt-injected agent can still try to ignore a skill. The
  deterministic half lives in the CLI, which is why prose-only "enforcement" is rejected here.

Hardening against an attacker who already has write access to your working tree is out of scope. Use file
permissions, signed commits, protected branches and repository access control for that; this tool makes
the process inspectable, not the machine trusted.

## Verifying what you installed

```bash
npm view arsdlc gitHead dist.integrity dist.fileCount
```

`gitHead` names the commit the tarball was packed from, and `packages/cli/README.md` has the loop that
compares every file in it against that tag. Releases published before npm trusted publishing is wired for
this repo carry a registry signature but no build attestation; `npm audit signatures` tells you which one
you have.
