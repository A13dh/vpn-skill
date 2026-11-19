# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## What this is

`vpn-skill` is a portable agent skill for controlling VPN connections. It is designed to be Claude Code native: it ships a `.claude-plugin/plugin.json`, a `skills/vpn/SKILL.md`, and this `CLAUDE.md`.

## Commands

```sh
node scripts/vpn.mjs status                 # all backends
node scripts/vpn.mjs list windows
node scripts/vpn.mjs connect tailscale
node scripts/vpn.mjs disconnect wireguard home
node scripts/vpn.mjs status --json
node scripts/vpn.mjs help
node --check scripts/vpn.mjs && node --check mcp/server.mjs
```

MCP server (stdio, no dependencies):

```sh
node mcp/server.mjs
```

## Architecture

- `scripts/vpn.mjs` — single source of truth. All backends (`wireguard`, `openvpn`, `tailscale`, `windows`) are implemented here; plugins and MCP server are thin wrappers.
- `skills/vpn/SKILL.md` — canonical portable skill. `.opencode/skills/vpn/SKILL.md` is a duplicate for OpenCode discovery.
- `.opencode/plugins/vpn/index.ts` — OpenCode tool plugin (`vpn_status`, `vpn_list`, `vpn_connect`, `vpn_disconnect`).
- `mcp/server.mjs` — hand-rolled JSON-RPC 2.0 MCP server over stdio; no npm install needed.
- `.claude-plugin/plugin.json` — Claude Code plugin manifest.

## Rules when editing

1. Never add credential handling, secret storage, or credential logging.
2. Connect/disconnect must always require explicit user intent and a permission prompt.
3. Keep the CLI dependency-free; do not add runtime npm dependencies to `scripts/` or `mcp/`.
4. Keep both copies of `SKILL.md` in sync.
5. Report failures verbatim; never hide an unavailable backend.
6. Prefer small, focused commits with the Claude Code commit trailer.
