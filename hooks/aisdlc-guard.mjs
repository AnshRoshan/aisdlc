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

// What counts as a completion claim. "done" alone is ordinary English, so it only matters
// against the gate state; a claim that the *suite* passed is the one that needs a run behind it.
const SUITE_CLAIM = /\b(all (?:the )?tests? pass\w*|tests? (?:are |all )?(?:green|passing)|suite (?:is |passes )?(?:green|clean)|everything passes|all green|no failures)\b/i;
const DONE_CLAIM = /\b(done|finished|complete|shipped|ready to (?:ship|merge|release))\b/i;

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

  // The other side of invariant 5. The Bash hold stops an unrecorded run from happening; this
  // one catches the case where no run happened at all and the answer reads like one did. The
  // model's turn is over by then, so this is for the human reading it, not a correction loop.
  on("turn.complete", async ($, e, next) => {
    try {
      const answer = String(e.answer ?? "");
      if (e.isAborted || e.agentId || !turn || !answer) return next(e);
      const claimsSuite = SUITE_CLAIM.test(answer);
      const claimsDone = DONE_CLAIM.test(answer);
      if (!claimsSuite && !claimsDone) return next(e);
      const log = await readLog($, turn.slug);
      if (!log) return next(e);
      if (claimsSuite && log.runs === 0) {
        $.ui.log(`aisdlc: the answer says the suite passed, and ${turn.slug} has no recorded run at all. That is a sentence, not evidence (invariant 5).`);
      } else if (claimsSuite && log.stale) {
        $.ui.log(`aisdlc: the answer says the suite passed, but the newest full run predates the last code change. Re-record: aisdlc evidence ${turn.slug} --label full -- <test command>`);
      } else if (claimsDone && log.state !== "DONE") {
        $.ui.log(`aisdlc: the answer says done. ${turn.slug} is ${log.state}${log.missing ? `, waiting on ${log.missing}` : ""} (invariant 2).`);
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

// ---- the CLI, as the only source of state ---------------------------------------

const CLI_BASES = [["aisdlc"], ["node", "packages/cli/bin/aisdlc.js"]];
let workingCli = null;

async function runCli($, args) {
  const order = workingCli ? [workingCli, ...CLI_BASES.filter((c) => c[0] !== workingCli[0])] : CLI_BASES;
  for (const base of order) {
    let run;
    try {
      run = await $.process.run([...base, ...args], { timeoutMs: 8000 });
    } catch {
      continue;
    }
    // report exits 3 when it found something stale; that is an answer, not a failure.
    if (!run || (run.code !== 0 && run.code !== 3)) continue;
    try {
      return { json: JSON.parse(String(run.stdout ?? "").trim()), cli: base[0] };
    } catch {
      continue;
    }
  }
  return null;
}

async function readState($) {
  const out = await runCli($, ["next", "--json"]);
  const j = out?.json;
  if (!j || !j.state) return null;
  workingCli = out.cli;
  return {
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

// report answers the one question turn.complete cannot settle from the transcript alone:
// is there a run behind the claim, and is it newer than the code?
async function readLog($, slug) {
  const out = await runCli($, slug ? ["report", slug, "--json"] : ["report", "--json"]);
  const j = Array.isArray(out?.json) ? out.json.find((r) => r.feature === slug) ?? out.json[0] : null;
  if (!j) return null;
  return { state: j.state, runs: j.runs?.total ?? 0, stale: !!j.evidence?.stale, missing: (j.gates?.missing ?? []).join(", ") };
}

async function currentAt($, path) {
  try {
    return String((await $.fs.read(path)) ?? "");
  } catch {
    return null;
  }
}
