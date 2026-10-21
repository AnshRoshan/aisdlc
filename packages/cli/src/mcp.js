/**
 * Read-only MCP server over stdio, so any MCP client can ask where the work stands without a harness
 * specific integration. Writes are absent on purpose: evidence, approvals and gate transitions stay
 * CLI actions that a human can see and a segregation-of-duties rule can police.
 *
 * JSON-RPC 2.0, one object per line. `handleRequest` is pure so tests drive it without a process.
 */

export const TOOLS = [
  {
    name: "arsdlc_next",
    description: "Derived state for one feature: stage, owner, blockers, the next task and the skill to load. Read-only; nothing here writes to disk.",
    inputSchema: { type: "object", properties: { feature: { type: "string", description: "feature slug; omit for the first open feature" } }, additionalProperties: false },
  },
  {
    name: "arsdlc_status",
    description: "Every feature with its lane, state, task counts and gate lights. Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const WRITE_ACTIONS = new Set(["approve", "evidence", "gate", "init", "new", "export", "lane", "delta"]);

export function handleRequest(message, api) {
  if (!message || typeof message !== "object" || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return { jsonrpc: "2.0", id: (message && message.id) ?? null, error: { code: -32600, message: "expected a JSON-RPC 2.0 request object with a method" } };
  }
  const { id, method, params = {} } = message;
  const reply = (result) => ({ jsonrpc: "2.0", id: id ?? null, result });
  const fail = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (method.startsWith("notifications/")) return null;

  switch (method) {
    case "initialize":
      return reply({
        protocolVersion: params.protocolVersion || "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: api.name, version: api.version, title: "arsdlc process state" },
        instructions: "arsdlc exposes read-only process state. Evidence and approvals are CLI actions a human performs; ask the user to run them.",
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const name = params.name;
      if (!TOOLS.some((t) => t.name === name)) {
        const attempted = String(name || "");
        const isWrite = [...WRITE_ACTIONS].some((a) => attempted.toLowerCase().includes(a));
        return fail(-32602, isWrite
          ? `"${attempted}" is not exposed over MCP: writing state through an agent would break segregation of duties. Ask the human to run \`arsdlc ${attempted.replace(/^arsdlc[-_]?/i, "").trim() || "approve"}\`.`
          : `unknown tool "${attempted}". available: ${TOOLS.map((t) => t.name).join(", ")}`);
      }
      try {
        const result = name === "arsdlc_next" ? api.next(params.arguments?.feature) : api.status();
        return reply({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
      } catch (error) {
        return reply({ content: [{ type: "text", text: `arsdlc could not answer: ${error.message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `method not found: ${method}`);
  }
}

/** Stdio loop: one JSON object per line in, one per response out. Malformed lines answer, never crash. */
export function readLoop(input, output, api) {
  let buffer = "";
  input.setEncoding("utf8");
  input.on("data", (chunk) => {
    buffer += chunk;
    let line;
    while ((line = buffer.match(/^([^\r\n]*)(\r?\n|$)/)) && line[2]) {
      buffer = buffer.slice(line[0].length);
      const raw = line[1].trim();
      if (!raw) continue;
      let message = null;
      try { message = JSON.parse(raw); }
      catch { output.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n"); continue; }
      const response = handleRequest(message, api);
      if (response) output.write(JSON.stringify(response) + "\n");
    }
  });
  input.on("end", () => output.end());
}
