<!--
One change per pull request. If the diff mixes a skill edit with an engine change, split it: they are
reviewed differently - one is prose, the other is enforcement.
-->

**What changed and why** — link the issue, or state the defect in one paragraph.

**Which requirement or task it serves** (`docs/features/<feature>/tasks.md` names it as `[R:...]`)

**How it was proven.** Paste the commands you ran, from the repository root, with their real output:

```
npm --prefix packages/cli test
node packages/cli/scripts/check-skills.mjs
node packages/cli/bin/arsdlc.js scan
node packages/cli/bin/arsdlc.js ci market-readiness
```

- [ ] A new CLI test reproduces the failure this change prevents, not only the happy path.
- [ ] Any gate semantics changed in `packages/cli/src/engine.js` also changed in the skill prose that
      describes them, and in `packages/cli/README.md` if the user-visible contract moved.
- [ ] No skill grew past its corpus budget (`check-skills.mjs` prints the numbers; prune, do not raise).
- [ ] `arsdlc scan` is clean and no credential appears in the diff, including in a test fixture.
- [ ] If a run record is cited, it is a recorded run (`evidence/…json`), not a description of one.

**What is still not covered** — say it plainly here. An unverified claim in this box is worth more than
silence; this project's own rule is that nothing goes green on prose alone.

**Screenshots or rendered output** for site, README or skill-format changes.
