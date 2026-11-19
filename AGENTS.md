# AGENTS.md — vpn-skill

Portable instructions for coding agents (Codex, Cursor, Gemini CLI, OpenCode, Claude Code, and similar).

## What this repo is

A safe, explicit-request-only capability for controlling VPN connections on the machine where the agent runs. It contains:

- `skills/vpn/SKILL.md` — the portable skill
- `scripts/vpn.mjs` — dependency-free CLI (the actual implementation)
- `.opencode/plugins/vpn/index.ts` — OpenCode tool plugin
- `.claude-plugin/plugin.json` — Claude Code plugin manifest
- `mcp/server.mjs` — dependency-free MCP server over stdio

## Agent rules

1. Only connect or disconnect a VPN when the user explicitly asks.
2. Run `node scripts/vpn.mjs status` first to discover available backends.
3. Use `node scripts/vpn.mjs <action> [backend] [profile] [--json]` for all operations.
4. Never read, print, copy, or commit VPN credentials, keys, tokens, or auth URLs.
5. Never auto-connect, never persist a connection across tasks, never bypass network policy.
6. If a backend is missing or needs admin/interactive login, report it and stop.
7. After any action, report the exact result to the user.

## Supported backends

`wireguard` (`wg`), `openvpn` (`ovpn`), `tailscale` (`ts`), `windows` (`win`, `ras`).

## Quick reference

```sh
node scripts/vpn.mjs status
node scripts/vpn.mjs list windows
node scripts/vpn.mjs connect tailscale
node scripts/vpn.mjs disconnect wireguard home
node scripts/vpn.mjs status --json
```

Exit code 0 = success, 1 = failure/unavailable.
