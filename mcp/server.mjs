#!/usr/bin/env node
// Dependency-free MCP server over stdio for vpn-skill.
// Launches with: node mcp/server.mjs

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = [
  path.resolve(HERE, "..", "scripts", "vpn.mjs"),
  path.resolve(process.cwd(), "scripts", "vpn.mjs"),
].find(existsSync) ?? path.resolve(HERE, "..", "scripts", "vpn.mjs");

const BACKENDS = ["wireguard", "wg", "openvpn", "ovpn", "tailscale", "ts", "windows", "win", "ras", "all"];

const TOOLS = [
  {
    name: "vpn_status",
    description: "Show the status of VPN backends. Read-only. Omit backend to check all.",
    inputSchema: {
      type: "object",
      properties: { backend: { type: "string", enum: BACKENDS } },
      additionalProperties: false,
    },
  },
  {
    name: "vpn_list",
    description: "List configured VPN profiles/tunnels for a backend.",
    inputSchema: {
      type: "object",
      properties: { backend: { type: "string", enum: BACKENDS } },
      additionalProperties: false,
    },
  },
  {
    name: "vpn_connect",
    description: "Connect a VPN tunnel. Only call when the user explicitly asked.",
    inputSchema: {
      type: "object",
      properties: {
        backend: { type: "string", enum: BACKENDS },
        profile: { type: "string", description: "Tunnel name, saved connection, or config path." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "vpn_disconnect",
    description: "Disconnect a VPN tunnel. Only call when the user explicitly asked.",
    inputSchema: {
      type: "object",
      properties: {
        backend: { type: "string", enum: BACKENDS },
        profile: { type: "string", description: "Tunnel name or saved connection." },
      },
      additionalProperties: false,
    },
  },
];

function callCli(args) {
  const r = spawnSync(process.execPath, [CLI, ...args, "--json"], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  const text = (r.stdout || r.stderr || "").trim() || "No output from vpn CLI";
  return { code: r.status ?? 1, text };
}

function send(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function fail(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id === undefined) return; // notification (e.g. notifications/initialized)

  switch (msg.method) {
    case "initialize":
      reply(msg.id, {
        protocolVersion: msg.params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "vpn-skill", version: "1.0.0" },
      });
      break;
    case "ping":
      reply(msg.id, {});
      break;
    case "tools/list":
      reply(msg.id, { tools: TOOLS });
      break;
    case "tools/call": {
      const name = msg.params?.name;
      const input = msg.params?.arguments ?? {};
      const action = {
        vpn_status: "status",
        vpn_list: "list",
        vpn_connect: "connect",
        vpn_disconnect: "disconnect",
      }[name];
      if (!action) {
        fail(msg.id, -32602, `Unknown tool: ${name}`);
        break;
      }
      const args = [action];
      if (input.backend) args.push(String(input.backend));
      if (input.profile) args.push(String(input.profile));
      const out = callCli(args);
      reply(msg.id, { content: [{ type: "text", text: out.text }], isError: out.code !== 0 });
      break;
    }
    default:
      fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
});

rl.on("close", () => process.exit(0));
