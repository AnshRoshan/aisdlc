# Runbook: Market readiness

## Symptoms to actions

| Symptom | First action | Escalate to |
|---|---|---|
| Publish fails with `ENEEDAUTH` | Check the npm trusted-publisher configuration and the workflow `id-token: write` permission; do not retry with a guessed token | maintainer |
| npm version exists but no GitHub release | Run `gh release create <tag> --verify-tag --generate-notes` against the published commit | maintainer |
| Deploy fails with `Node.js v20 is not supported by Astro` | Check `node-version` in `deploy.yml`; the build must use >=22.12 | maintainer |
| Live site is stale while CI is green | Read the `deploy site` run, not the `ci` run; the last successful deploy is the live artifact | maintainer |
| Gate fails `STALE_APPROVAL` after an evidence-only change | Check the `evidence/` exemption; if code moved, re-approve; never edit the approval file by hand | author + human approver |
| Export verification fails | Identify the mismatched evidence checksum; do not edit evidence or the statement to force a pass | maintainer |
| MCP client sees no tools | Check stdio framing (one JSON-RPC object per line) and that `doctor` detects the project | maintainer |
| `claude plugin validate .` fails | Check manifest paths, version sync and the guard module; fix the manifest, not the validator | maintainer |
| Approval churn makes the flow unusable | Measure how often unrelated commits land; narrow binding to the feature diff if F-03 is confirmed | maintainer + human |

## Dashboards and logs

- GitHub Actions: `ci`, `deploy site`, `publish cli`, `gate`.
- npm package page: version, provenance, deprecations.
- Live site: `https://anshroshan.github.io/arsdlc/`.
- Local: `arsdlc report`, `arsdlc doctor --json`, `arsdlc audit`.

## Contacts

Maintainer: Ansh Roshan. There is no on-call rotation; this is a local-first open-source project. A failed release waits for the maintainer rather than being forced.
