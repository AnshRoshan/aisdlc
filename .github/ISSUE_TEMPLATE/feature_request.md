---
name: Feature request
about: A capability the process kit is missing
labels: enhancement
---

**The problem in one paragraph** — what you are trying to ship, and where the kit stopped helping.
Describe the work, not the feature.

**What you did instead** — the manual step, the skill you loaded, the file you edited by hand.

**Which part of the process it belongs to**

- [ ] a skill (`skills/arsdlc-*`, which one)
- [ ] a CLI verb or gate check (`packages/cli/src/engine.js` is where enforcement lives)
- [ ] a harness installation target (`packages/cli/src/harnesses.js`)
- [ ] a lane (`spike` / `quick` / `standard` / `regulated`)
- [ ] evidence, export or attestation (`in-toto`, DSSE, SARIF)

**Does it fit the invariants?** Several good-sounding features fail here:

1. The spec is the source of truth; intent changes go through deltas.
2. Gates are transitions with evidence, not suggestions.
3. Segregation of duties: approver ≠ author. Agents never approve.
4. Humans own the acceptance bar.
5. Done = a recorded run artifact.
6. Disk is state; chat is not.
7. Secrets never land in files.
8. Fail loud, never fake green.

If the request wants the tool to approve, sign, or infer state from the conversation, the answer is
already no, and the reason is in `docs/`.

**Would you send the change?** If yes, read `CONTRIBUTING.md` first: the CLI has no runtime
dependencies, gate changes need a regression test that reproduces the failure, and corpus checks
limit how much instruction text a skill may load.
