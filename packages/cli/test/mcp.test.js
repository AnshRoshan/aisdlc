import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { handleRequest, TOOLS } from "../src/mcp.js";

const cli = fileURLToPath(new URL("../bin/arsdlc.js", import.meta.url));
const api = {
  name: "arsdlc",
  version: "0.0.0-test",
  next: (feature) => ({ feature: feature || "demo", state: "BUILD", owner: "agent" }),
  status: () => [{ feature: "demo", state: "BUILD" }],
};
const req = (method, params) => ({ jsonrpc: "2.0", id: 1, method, params });

test("initialize advertises a read-only tool surface and the version it was asked for", () => {
  const res = handleRequest(req("initialize", { protocolVersion: "2026-07-28" }), api);
  assert.equal(res.result.protocolVersion, "2026-07-28");
  assert.deepEqual(res.result.capabilities, { tools: { listChanged: false } });
  assert.equal(res.result.serverInfo.version, "0.0.0-test");
  assert.match(res.result.instructions, /CLI actions/);
  assert.deepEqual(TOOLS.map((t) => t.name), ["arsdlc_next", "arsdlc_status"]);
});

test("tools/call returns state and rejects anything that would write", () => {
  const next = handleRequest(req("tools/call", { name: "arsdlc_next", arguments: { feature: "x" } }), api);
  assert.equal(next.result.isError, false);
  assert.equal(JSON.parse(next.result.content[0].text).feature, "x");
  assert.equal(handleRequest(req("tools/call", { name: "arsdlc_status", arguments: {} }), api).result.structuredContent[0].state, "BUILD");

  for (const name of ["arsdlc_approve", "arsdlc_evidence", "write_spec"]) {
    const denied = handleRequest(req("tools/call", { name, arguments: {} }), api);
    assert.ok(denied.error, `${name} must be refused`);
    if (name !== "write_spec") assert.match(denied.error.message, /segregation of duties|Ask the human/);
    else assert.match(denied.error.message, /unknown tool/);
  }
});

test("malformed and unknown messages answer with JSON-RPC errors instead of crashing", () => {
  assert.equal(handleRequest(null, api).error.code, -32600);
  assert.equal(handleRequest({ jsonrpc: "1.0", id: 2, method: "tools/list" }, api).error.code, -32600);
  assert.equal(handleRequest(req("tools/nope"), api).error.code, -32601);
  assert.equal(handleRequest({ jsonrpc: "2.0", method: "notifications/initialized" }, api), null, "notifications get no reply");
  const boom = handleRequest(req("tools/call", { name: "arsdlc_next", arguments: { feature: "missing" } }), { ...api, next: () => { throw new Error("no such feature"); } });
  assert.equal(boom.result.isError, true);
  assert.match(boom.result.content[0].text, /no such feature/);
});

test("the stdio loop answers a real client line by line", (t) => {
  const root = mkdtempSync(join(tmpdir(), "arsdlc-mcp-"));
  t.after(() => { assert.ok(resolve(root).startsWith(resolve(tmpdir()))); rmSync(root, { recursive: true, force: true }); });
  writeFileSync(join(root, "arsdlc.json"), JSON.stringify({ version: 1, project: "probe", docsDir: "docs", featuresDir: "docs/features", harnesses: ["universal"], policy: { minApprovals: { G1: 1, G5: 1 } } }) + "\n");
  const spawnMcp = (input) => spawnSync(process.execPath, [cli, "--cwd", root, "mcp", "--stdio"], { encoding: "utf8", input, env: { ...process.env, AISDLC_AGENT: "" } });

  const help = spawnSync(process.execPath, [cli, "--cwd", root, "mcp"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /read-only MCP server over stdio/);

  const session = spawnMcp([
    JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    "not json at all",
    JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "arsdlc_status", arguments: {} } }),
  ].join("\n") + "\n");
  assert.equal(session.status, 0, session.stderr);
  const lines = session.stdout.trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => l.id), [1, 2, null, 3], "the notification produces no line; the parse error answers with id null");
  assert.equal(lines[0].result.serverInfo.name, "arsdlc");
  assert.deepEqual(lines[1].result.tools.map((t) => t.name), ["arsdlc_next", "arsdlc_status"]);
  assert.equal(lines[2].error.code, -32700);
  assert.equal(lines[3].result.isError, false);
  assert.deepEqual(JSON.parse(lines[3].result.content[0].text), [], "an empty project answers with an empty list, not an error");
});
