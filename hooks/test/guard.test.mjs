import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

let serial = 0;
async function harness({ state = { state: "BUILD", feature: "demo" }, files = {}, fallback = false } = {}) {
  const { register } = await import(`../aisdlc-guard.mjs?test=${serial++}`);
  const handlers = [];
  const calls = [], logs = [], statuses = [];
  const $ = {
    process: { async run(argv) {
      calls.push(argv);
      if (fallback && argv[0] === "aisdlc") throw new Error("not installed");
      const payload = argv.includes("report") ? [{ feature: "demo", state: "BUILD", runs: { total: 0 } }] : state;
      return { exitCode: 0, stdout: JSON.stringify(payload), stderr: "" };
    } },
    fs: { async read(path) { if (!(path in files)) throw new Error("not found"); return files[path]; } },
    ui: { status(text) { statuses.push(text); }, invalidate() {}, toast() {}, log(text) { logs.push(text); }, resolve() { throw new Error("UI unavailable"); } },
  };
  register((event, matcher, handler) => handlers.push({ event, matcher: handler ? matcher : {}, handler: handler ?? matcher }));
  async function fire(event, input = {}) {
    const entry = handlers.find((entry) => entry.event === event && (!entry.matcher.tool || [entry.matcher.tool].flat().includes(input.tool)));
    assert.ok(entry, `handler for ${event}`);
    return entry.handler($, input, (next) => ({ forwarded: next }));
  }
  return { fire, calls, logs, statuses };
}

test("plugin JSON parses and hook module path exists", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../.claude-plugin/plugin.json", import.meta.url), "utf8"));
  const marketplace = JSON.parse(readFileSync(new URL("../../.claude-plugin/marketplace.json", import.meta.url), "utf8"));
  const config = JSON.parse(readFileSync(new URL("../hooks.json", import.meta.url), "utf8"));
  assert.equal(manifest.name, marketplace.plugins[0].name);
  assert.equal(manifest.version, marketplace.plugins[0].version);
  assert.equal(config.modules.length, 1);
  assert.ok(readFileSync(new URL(`../${config.modules[0]}`, import.meta.url), "utf8").includes("export function register"));
});

test("CLI argv stays intact across prompts and completion reports", async () => {
  const h = await harness();
  await h.fire("prompt.submit", { context: [] });
  await h.fire("prompt.submit", { context: [] });
  await h.fire("turn.complete", { answer: "All tests pass" });
  assert.deepEqual(h.calls, [["aisdlc", "next", "--json"], ["aisdlc", "next", "--json"], ["aisdlc", "report", "demo", "--json"]]);
  assert.equal(h.logs.length, 1);
});

test("fallback CLI retains the node script prefix", async () => {
  const h = await harness({ fallback: true });
  await h.fire("prompt.submit");
  await h.fire("prompt.submit");
  assert.deepEqual(h.calls.at(-1), ["node", "packages/cli/bin/aisdlc.js", "next", "--json"]);
});

test("bare tests are held, recorded evidence passes through", async () => {
  const h = await harness();
  await h.fire("prompt.submit");
  for (const command of ["npm test", "npm run test", "npm run build", "pytest", "python -m pytest", "node --test"]) {
    assert.match((await h.fire("tool.call", { tool: "Bash", command })).deny, /evidence demo/);
  }
  assert.ok((await h.fire("tool.call", { tool: "Bash", command: "aisdlc evidence demo --label full -- npm test" })).forwarded);
  assert.match((await h.fire("tool.call", { tool: "Bash", command: "aisdlc approve G1 demo" })).deny, /human actions/);
});

test("unrelated process commands do not exempt an unrecorded test", async () => {
  const h = await harness();
  await h.fire("prompt.submit");
  for (const command of ["aisdlc status && npm test", 'echo "aisdlc status"; npm test']) {
    assert.match((await h.fire("tool.call", { tool: "Bash", command })).deny, /unrecorded|evidence/);
  }
  assert.ok((await h.fire("tool.call", { tool: "Bash", command: "node packages/cli/bin/aisdlc.js evidence demo -- npm test" })).forwarded);
});

test("compound evidence prefix cannot exempt a second bare test", async () => {
  const h = await harness();
  await h.fire("prompt.submit");
  assert.match((await h.fire("tool.call", { tool: "Bash", command: "aisdlc evidence demo -- npm test && npm test" })).deny, /evidence/);
  assert.ok((await h.fire("tool.call", { tool: "Bash", command: 'aisdlc evidence demo -- node -e "console.log(1 | 2)"' })).forwarded);
});

test("direct node approval commands are held", async () => {
  const h = await harness();
  assert.match((await h.fire("tool.call", { tool: "Bash", command: "node packages/cli/bin/aisdlc.js approve G1 demo" })).deny, /human actions/);
});

test("CLI-owned paths use Windows or POSIX separators", async () => {
  const h = await harness();
  for (const file_path of ["D:\\repo\\docs\\features\\demo\\approvals.json", "docs/features/demo/evidence/run.json"]) {
    assert.match((await h.fire("tool.call", { tool: "Write", file_path, content: "{}" })).deny, /CLI only/);
  }
});

test("Write, Edit and MultiEdit cannot introduce a human signature", async () => {
  const h = await harness({ files: { "acceptance.md": "Approved-by: ______\nnotes" } });
  for (const input of [
    { tool: "Write", content: "Approved-by: Ansh" },
    { tool: "Edit", old_string: "______", new_string: "Ansh" },
    { tool: "MultiEdit", edits: [{ old_string: "______", new_string: "Ansh" }] },
  ]) {
    assert.match((await h.fire("tool.call", { file_path: "acceptance.md", ...input })).deny, /humans own/);
  }
  assert.ok((await h.fire("tool.call", { tool: "Write", file_path: "new.md", content: "Approved-by:   ______" })).forwarded);
});

test("ordinary edits preserve an existing acceptance signature", async () => {
  const h = await harness({ files: { "acceptance.md": "Approved-by: Ansh\nnotes" } });
  assert.ok((await h.fire("tool.call", { tool: "Edit", file_path: "acceptance.md", old_string: "notes", new_string: "updated notes" })).forwarded);
});

test("signed spec detection is bound to the edited file, not the active feature", async () => {
  const h = await harness({ files: { "docs/features/signed/spec.md": "Approved-by: Ansh", "docs/features/unsigned/spec.md": "Approved-by: ______" } });
  assert.match((await h.fire("tool.call", { tool: "Edit", file_path: "docs/features/signed/spec.md", old_string: "Ansh", new_string: "______" })).deny, /is signed/);
  assert.ok((await h.fire("tool.call", { tool: "Edit", file_path: "docs/features/unsigned/spec.md", old_string: "spec", new_string: "specification" })).forwarded);
});

test("state absence clears the status and UI failures fail open", async () => {
  const h = await harness({ state: null });
  assert.ok((await h.fire("prompt.submit")).forwarded);
  assert.equal(h.statuses.at(-1), undefined);
  const active = await harness();
  await active.fire("prompt.submit");
  assert.ok((await active.fire("ui.render", { component: "AbovePrompt" })).forwarded);
});
