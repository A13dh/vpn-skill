#!/usr/bin/env node
// Install vpn-skill into a target project. Never overwrites existing files.

import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parse(argv) {
  const out = { target: process.cwd(), agent: "all", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--target") out.target = argv[++i];
    else if (a.startsWith("--target=")) out.target = a.slice(9);
    else if (a === "--agent") out.agent = argv[++i];
    else if (a.startsWith("--agent=")) out.agent = a.slice(8);
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

const opts = parse(process.argv.slice(2));

if (opts.help) {
  console.log([
    "vpn-skill installer",
    "",
    "Usage: node scripts/install.mjs [--target <dir>] [--agent opencode|claude|generic|mcp|all] [--dry-run]",
    "",
    "Copies skill/plugin files into the target project. Existing files are skipped.",
  ].join("\n"));
  process.exit(0);
}

const target = path.resolve(opts.target);
const seen = new Set();
const agent = String(opts.agent || "all").toLowerCase();
const modes = agent === "all" ? ["opencode", "claude", "generic", "mcp"] : [agent];
const valid = ["opencode", "claude", "generic", "mcp"];

if (modes.some((m) => !valid.includes(m))) {
  console.error(`Unknown agent: ${agent}. Use ${valid.join(", ")} or all.`);
  process.exit(1);
}

function install(srcRel, destRel, label) {
  const src = path.join(REPO, srcRel);
  const dest = path.join(target, destRel);
  if (seen.has(dest)) return;
  seen.add(dest);
  if (!existsSync(src)) {
    console.log(`MISSING ${label}: ${src}`);
    return;
  }
  if (existsSync(dest)) {
    console.log(`SKIP ${label}: ${dest} already exists`);
    return;
  }
  if (opts.dryRun) {
    console.log(`DRY-RUN ${label}: ${src} -> ${dest}`);
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`OK ${label}: ${dest}`);
}

console.log(`Target: ${target}`);
console.log(`Agent: ${agent}${opts.dryRun ? " (dry run)" : ""}`);

if (modes.includes("opencode")) {
  install(".opencode/plugins/vpn", ".opencode/plugins/vpn", "OpenCode plugin");
  install(".opencode/skills/vpn", ".opencode/skills/vpn", "OpenCode skill");
  install("scripts/vpn.mjs", "scripts/vpn.mjs", "VPN CLI");
}

if (modes.includes("claude")) {
  install("skills/vpn", ".claude/skills/vpn", "Claude Code skill");
  install("CLAUDE.md", "CLAUDE.md", "CLAUDE.md");
  install(".claude/settings.json", ".claude/settings.json", "Claude Code settings");
}

if (modes.includes("generic")) {
  install("AGENTS.md", "AGENTS.md", "AGENTS.md");
  install("scripts/vpn.mjs", "scripts/vpn.mjs", "VPN CLI");
}

if (modes.includes("mcp")) {
  const server = path.join(REPO, "mcp", "server.mjs");
  console.log("\nMCP server config (add to your MCP client):");
  console.log(JSON.stringify({
    mcpServers: {
      vpn: {
        command: "node",
        args: [server],
      },
    },
  }, null, 2));
}

console.log("\nDone. Verify with: node scripts/vpn.mjs status --json");
console.log("No VPN client is bundled. WireGuard, OpenVPN, Tailscale, or a Windows VPN connection must already exist.");
