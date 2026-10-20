# Library Docs

Rule: before using any external format, API or tool, read the current primary docs. Framework versions outrun training data.

## Installed agent skills / MCP servers

| Library | Skill or MCP | When to load it |
|---|---|---|
| aisdlc | local skills in `skills/` | Every engineering task in this repo |
| No third-party MCP is required | - | - |

## External specs and where to check them

| Surface | Primary source | When it matters |
|---|---|---|
| Agent Skills format | `agentskills.io/specification` | Editing frontmatter, adding `allowed-tools`, packaging |
| Claude Code plugins and mods | `code.claude.com/docs/en/plugins` | `plugin.json`, marketplace, `hooks.json`, guard API |
| Codex plugins | `developers.openai.com/plugins/build/plugins` | Portable plugin manifest, `.agents/plugins/marketplace.json` |
| skills CLI | `github.com/vercel-labs/skills` | `skills add`, lockfile, package `"skills"` array |
| npm trusted publishing | npm docs, OIDC from GitHub Actions | Publishing without a long-lived token |
| Astro | `docs.astro.build` | Site build and Node version requirements |
| GitHub Pages | `actions/deploy-pages` | Deploy permissions and artifact layout |
| in-toto Statement | `github.com/in-toto/attestation` | Evidence export predicate |
| DSSE | `github.com/secure-systems-lab/dsse` | Envelope format |
| SLSA | `slsa.dev/spec` | Provenance vocabulary |
| Sigstore | `docs.sigstore.dev` | Optional keyless signing and offline verification |
| SARIF | OASIS SARIF 2.1.0 | Findings export |
| OTel GenAI semconv | `github.com/open-telemetry/semantic-conventions-genai` | Trace export; attributes are not all stable |

## Per-surface notes

### Astro and Pages

- Astro 7 requires Node >=22.12. `withastro/action@v3` defaults to Node 20, which is why the last deploy failed. Pass `node-version: 22` or build with `actions/setup-node` first.
- The site is static. No server runtime, no secrets in the build.

### npm publishing

- The existing workflow expects `NPM_TOKEN`. The last run failed with `ENEEDAUTH`.
- Preferred: npm trusted publishing with GitHub OIDC and `--provenance`; no long-lived token.
- A failed publish must not create a release or move the tag.

### Harness layouts

- Claude Code: `.claude/skills`, `.claude/commands`, `.claude/agents`, plus the plugin manifest.
- Codex: `.agents/skills` and `.agents/plugins`.
- Cursor: `.cursor/skills` and `.agents/skills`.
- Copilot: `.github/skills` and the Copilot CLI plugin marketplace.
- Antigravity replaced Gemini CLI on 2026-06-18. `.gemini/skills` still loads as an Antigravity plugin, but the harness name is gone.
- Devin Desktop replaced Windsurf on 2026-06-02. `.devin/skills` is preferred; `.windsurf` is legacy.
- OpenCode: `.opencode/skills` with allow/deny/ask permissions.

## Known operational gotchas

- Windows junctions are used in link mode because symlinks need privileges. Test copy and link paths on Windows.
- Never concatenate argv for a shell; package-manager shims resolve to Node scripts.
- `.gitignore` previously ignored `AGENTS.md` and `CLAUDE.md` as init artifacts. Hand-authored context is now tracked; installed copies remain ignored.
- The live site can be stale while the workflow is red. A green CI run does not imply a successful Pages deploy.
- A git tag can exist without a GitHub release; the publish job creates the release only after npm succeeds.
