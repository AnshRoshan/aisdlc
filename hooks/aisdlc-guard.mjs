// aisdlc guard - the eight invariants, enforced in the process instead of in the prose.
//
// The CLI is the referee, but a referee only sees what gets reported to it: today an agent
// can run `npm test` directly and simply not mention it, or type a name into `Approved-by:`.
// These hooks close the three holes that cost the most, for Claude Code specifically. Every
// other harness keeps the portable contract (skills + CLI), which is why nothing here is
// required for the process to work: if the guard cannot decide, it lets the call through.
//
// Two rules this file follows, both from the mod API:
//   - the host reads `on(...)` and `$.noun.method(...)` from source, so they stay spelled out
//   - a hook gets 10s of its own time; time spent inside a `$` call is free
//
// Fail-open discipline: a guard that throws must never cost the user their work. Every handler
// catches and calls next().

const CLI_CANDIDATES = [
  ["aisdlc", "next", "--json"],
  ["node", "packages/cli/bin/aisdlc.js", "next", "--json"],
];

// Runners whose green output means "verified". If the agent runs one bare, nothing is recorded.
const TEST_RUNNER = /(^|[\s&;|])(npm|pnpm|yarn|bun|deno|make|cargo|go|uv|pip|pytest|npx|node|dotnet|mvn|gradle|rspec)\s\S*(test|vitest|jest|pytest|mocha|check|verify|spec|tsc|build)/i;
// Commands that are the process working, not the process being dodged.
const PROCESS_OK = /aisdlc\s+(evidence|gate|gates|scan|next|status|check|trace|audit|doctor|approve|new|lane|kinds|init|addon|skills)\b/;
// Files only the CLI may write, and the artifact a signed spec cannot be edited into.
const CLI_OWNED = /(^|\/)docs\/features\/[^/]+\/(evidence\/|approvals\.json)/;
const SIGNED_SPEC = /(^|\/)docs\/features\/[^/]+\/spec\.md$/;
const APPROVAL_LINE = /Approved-by:\s*(?!_)(?=\S)([^·\n|]+)/;

// Per-turn cache, refreshed on prompt.submit: { state, slug, lane, blocking, cli }
let turn = null;

export function register(on) {
  // The state comes from disk once per turn, then every guard below reads the cache instead of
  // spawning a process per tool call.
  on("prompt.submit", async ($, e, next) => {
    try {
      turn = await readState($);
      if (turn) $.ui.status(`aisdlc ${turn.slug} · ${turn.state}`);
    } catch {
      turn = null;
    }
    if (!turn) return next(e);
    const line = `aisdlc state (from disk, this turn): feature ${turn.slug}, lane ${turn.lane}, state ${turn.state}, next skill ${turn.skill}. ` +
      (turn.blocking ? `Blocking: ${turn.blocking}. ` : "") +
      `The guard mod holds bare test runs, spec edits and approvals in this repo; route intent changes through aisdlc-delta.`;
    return next({ ...e, context: [...(e.context ?? []), line] });
  });

  // Invariant 5 and 8: "done" must be a run the tool recorded, not a run the agent watched.
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const command = String(e.command ?? "");
    try {
      if (/\baisdlc(-cli)?\s+approve\b/.test(command)) {
        return { deny: "aisdlc guard: approvals are human actions (invariant 3 and 4). Ask the user to run it themselves in their own terminal; do not retry, and do not write the approval into approvals.json by hand." };
      }
      if (turn && TEST_RUNNER.test(command) && !PROCESS_OK.test(command)) {
        const wrapped = `aisdlc evidence ${turn.slug} --label full -- ${command}`;
        $.ui.toast("aisdlc guard: held an unrecorded test run");
        return { deny: `aisdlc guard: this run would not be evidence, and a claim without a recorded run does not count (invariant 5). Re-run it as: ${wrapped}` };
      }
    } catch {
      /* fail open */
    }
    return next(e);
  });

  // Invariants 1, 2 and 4: the spine is written by its owner, and a signature is a human's line.
  on("tool.call", { tool: ["Edit", "Write", "MultiEdit"] }, async ($, e, next) => {
    const path = String(e.path ?? e.file_path ?? e.input?.path ?? e.input?.file_path ?? "");
    try {
      if (CLI_OWNED.test(path)) {
        return { deny: `aisdlc guard: ${path} is written by the CLI only. Evidence and approvals are the artifacts the gates trust; a hand-written one is a forged one. Record a run with \`aisdlc evidence\`, and ask the human to approve.` };
      }
      const incoming = String(e.content ?? e.new_text ?? e.newString ?? e.input?.content ?? "");
      if (incoming && APPROVAL_LINE.test(incoming) && !/^[\s_]*$/.test(incoming.match(APPROVAL_LINE)[1])) {
        const current = await currentAt($, path);
        if (current && /Approved-by:\s*_/.test(current) && !/Approved-by:\s*_/.test(incoming)) {
          $.ui.toast("aisdlc guard: held a hand-written signature");
          return { deny: "aisdlc guard: humans own the acceptance bar (invariant 4). Leave `Approved-by: ______` exactly as it is and ask the user to sign it." };
        }
      }
      if (SIGNED_SPEC.test(path) && turn?.specSigned) {
        return { deny: `aisdlc guard: ${path} is signed. Intent changes go through a delta, never a quiet edit (invariant 1). Load aisdlc-delta: it writes the Change table, updates the spec explicitly and invalidates the stale approvals on purpose.` };
      }
    } catch {
      /* fail open */
    }
    return next(e);
  });

  // Where the feature actually is, always visible, without anyone remembering to ask.
  on("ui.render", { component: "AbovePrompt" }, ($, e, next) => {
    if (!turn) return next(e);
    const { Box, Text } = $.ui.resolve(e);
    const lights = (turn.gates ?? [])
      .map((g) => `${g.id}${g.passed ? "✓" : g.required ? "·" : "-"}`)
      .join(" ");
    return Box({
      key: "aisdlc-band",
      flexDirection: "column",
      paddingX: 1,
      children: [
        Text({
          key: "line",
          dimColor: true,
          children: `aisdlc · ${turn.slug} · lane ${turn.lane} · ${turn.state} → ${turn.skill} · ${lights}${turn.owner === "human" ? " · waiting on you" : ""}`,
        }),
      ],
    });
  });
}

// ---- state ---------------------------------------------------------------------

async function readState($) {
  for (const argv of CLI_CANDIDATES) {
    let run;
    try {
      run = await $.process.run(argv, { timeoutMs: 8000 });
    } catch {
      continue;
    }
    if (!run || run.code !== 0) continue;
    let j;
    try {
      j = JSON.parse(String(run.stdout ?? "").trim());
    } catch {
      continue;
    }
    if (!j || !j.state) return null;
    return {
      cli: argv[0],
      state: j.state,
      slug: j.feature ?? "",
      lane: j.lane ?? "standard",
      skill: j.skill ?? "aisdlc-flow",
      owner: j.owner ?? "agent",
      blocking: (j.blocking ?? []).slice(0, 3).join("; "),
      specSigned: !!j.spec?.signedBy,
      gates: Object.entries(j.gates ?? {}).map(([id, g]) => ({ id, passed: !!g.passed, required: g.required !== false && !g.skipped })),
    };
  }
  return null;
}

async function currentAt($, path) {
  try {
    return String((await $.fs.read(path)) ?? "");
  } catch {
    return null;
  }
}
