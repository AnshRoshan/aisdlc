---
name: Bug report
about: Something the CLI or a skill did not do as documented
labels: bug
---

<!--
arsdlc is a process kit: the useful bug report is the one that can be reproduced from files,
not from a chat transcript. Paste command output; do not describe it.
-->

**What happened**

**What the docs promise** (`README.md`, the skill's SKILL.md, or `--help` — name the line)

**Reproduce it**

```
node packages/cli/bin/arsdlc.js --version     # or: npx arsdlc --version
node packages/cli/bin/arsdlc.js doctor
node packages/cli/bin/arsdlc.js next <feature> --json
<the exact command, with its flags, and its exit code>
```

**Harness and platform** (Claude Code / Codex CLI / Cursor / Antigravity / Copilot / Devin / OpenCode;
Windows 10/11 or Linux; Node version from `node --version`)

**Lane and gate involved** (spike / quick / standard / regulated; G1–G6 if a gate misfired)

**Evidence on disk** — paste the JSON of the run record involved:

```
cat docs/features/<feature>/evidence/<file>.json
```

**Expected**

**Actual**

**A reduced case, if you have one** — the tree, spec/plan/tasks text, or a fixture repo. A bug that
reproduces in a two-file feature takes minutes to fix; one that only happens in your repo does not.
