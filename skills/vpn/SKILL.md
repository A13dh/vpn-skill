---
name: vpn
description: Manage VPN connections safely with WireGuard, OpenVPN, Tailscale, or Windows built-in VPN. Use when the user asks to connect, disconnect, inspect, or list VPN tunnels/profiles, or to diagnose a VPN connection problem.
---

# VPN Skill

Let the agent control VPN tunnels on the machine it is running on. Support four backends:

- `wireguard` (alias `wg`) — `wg-quick` on Linux/macOS, `wireguard.exe` on Windows
- `openvpn` (alias `ovpn`) — `openvpn --config` / Windows OpenVPN GUI service
- `tailscale` (alias `ts`) — `tailscale up|down|status`
- `windows` (aliases `win`, `ras`) — Windows built-in RAS VPN via `rasdial` and PowerShell

## Rules

1. **Only act on an explicit user request.** Never connect, disconnect, or change routing on your own.
2. **Ask for confirmation** before `connect`/`disconnect` when a permission prompt is available. Status/list are read-only and safe.
3. **Never store, print, or commit credentials.** VPN secrets belong in the OS/VPN client config. Do not log passwords, keys, tokens, or auth URLs that contain tokens.
4. **Do not bypass policy.** If a network, employer, or site forbids VPN use, stop and tell the user.
5. **Check availability first.** Run `status` or `list` and report which backends exist. If none are installed, say so and stop — this skill cannot provide a VPN service by itself.
6. **Prefer the CLI** in `scripts/vpn.mjs`. It is dependency-free and is the single source of truth used by the plugins and MCP server.
7. **Report the result verbatim** (minus secrets). If a command needs `sudo`, an interactive browser login, or admin rights, tell the user exactly what to do.

## Commands

From the repo root:

```sh
node scripts/vpn.mjs status                    # all backends
node scripts/vpn.mjs status tailscale
node scripts/vpn.mjs list windows
node scripts/vpn.mjs connect wireguard home
node scripts/vpn.mjs connect openvpn ~/vpn/work.ovpn
node scripts/vpn.mjs connect tailscale
node scripts/vpn.mjs disconnect windows OfficeVPN
```

Add `--json` for machine-readable output:

```sh
node scripts/vpn.mjs status --json
```

Exit code `0` means success, `1` means one or more backends failed or are unavailable.

## Environment

- `VPN_CONFIG_DIR` — WireGuard config directory (default `/etc/wireguard` or `%ProgramFiles%\WireGuard\Data\Configurations`)
- `OPENVPN_CONFIG_DIR` — OpenVPN profile directory (default `/etc/openvpn` or `%USERPROFILE%\OpenVPN\config`)

## OpenCode plugin

Copy `.opencode/plugins/vpn/` into your project's `.opencode/plugins/vpn/` and `scripts/` into the project root. Then call:

```js
await tools.vpn.status({ backend: "tailscale" })
await tools.vpn.connect({ backend: "windows", profile: "OfficeVPN" })
```

The plugin asks for permission before connect/disconnect.

## MCP server

```sh
node mcp/server.mjs
```

Configure your MCP client to launch that command over stdio. Tools exposed: `vpn_status`, `vpn_list`, `vpn_connect`, `vpn_disconnect`.

## Troubleshooting

- `WireGuard is not installed or configured` → install WireGuard or set `VPN_CONFIG_DIR`.
- `A saved VPN connection name is required` → run `list windows` first; use the exact `Name`.
- `Tailscale up command accepted...` → finish device login in the browser; the skill cannot do interactive auth for you.
- `openvpn --daemon` may still require elevated privileges; ask the user to run it in an admin shell if it fails.
