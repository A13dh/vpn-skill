# vpn-skill

A small, portable agent skill that teaches coding agents how to **connect, disconnect, inspect, and list VPN connections** — safely and only when explicitly asked.

It supports four backends through one dependency-free CLI:

| Backend | Aliases | Platform | Command used |
|---|---|---|---|
| WireGuard | `wg` | Linux/macOS/Windows | `wg-quick`, `wg`, `wireguard.exe` |
| OpenVPN | `ovpn` | Linux/macOS/Windows | `openvpn --config` |
| Tailscale | `ts` | Linux/macOS/Windows | `tailscale up/down/status` |
| Windows VPN | `win`, `ras` | Windows only | `rasdial`, PowerShell `Get-VpnConnection` |

> **This repo does not provide a VPN service or credentials.** It only drives VPN clients already installed on the host. If no client is configured, the skill reports that and stops.

## Why a repo instead of just a SKILL.md?

A skill file is instructions. This repo packages the full stack:

- `skills/vpn/SKILL.md` — portable instructions for any agent
- `scripts/vpn.mjs` — the real implementation (Node.js, zero dependencies)
- `.opencode/plugins/vpn/index.ts` — OpenCode tools (`vpn_status`, `vpn_list`, `vpn_connect`, `vpn_disconnect`) with permission gating
- `.claude-plugin/plugin.json` — Claude Code plugin manifest
- `mcp/server.mjs` — stdio MCP server, zero dependencies
- `AGENTS.md` — generic agent rules
- `perplexity/INSTRUCTIONS.md` — notes for Perplexity Spaces / MCP

## Install

### OpenCode

Copy the plugin and script into your project:

```sh
cp -r .opencode/plugins/vpn <your-project>/.opencode/plugins/
cp -r scripts <your-project>/
cp -r .opencode/skills/vpn <your-project>/.opencode/skills/
```

Then:

```js
await tools.vpn.status({ backend: "tailscale" })
await tools.vpn.connect({ backend: "windows", profile: "OfficeVPN" })
```

Connect/disconnect require an OpenCode permission approval. See `examples/opencode.jsonc` for a ready-made permission rule.

### Claude Code

This repo is Claude Code native: it includes `CLAUDE.md`, `.claude/settings.json`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`.

Install from this repo as a plugin, or copy `skills/vpn/` into your `.claude/skills/` directory. The manifest at `.claude-plugin/plugin.json` exposes the skill to Claude Code plugin loaders.

### MCP (any MCP client)

```sh
node mcp/server.mjs
```

Configure your client to launch it over stdio:

```json
{
  "mcpServers": {
    "vpn": {
      "command": "node",
      "args": ["<absolute-path-to-this-repo>/mcp/server.mjs"]
    }
  }
}
```

No `npm install` needed.

### Other agents (Codex, Cursor, Gemini CLI, Perplexity, …)

Point the agent at `AGENTS.md`, or paste `skills/vpn/SKILL.md` into its project instructions. Perplexity users see `perplexity/INSTRUCTIONS.md`.

## CLI usage

```sh
node scripts/vpn.mjs status                       # all backends
node scripts/vpn.mjs status tailscale
node scripts/vpn.mjs list windows
node scripts/vpn.mjs connect wireguard home
node scripts/vpn.mjs connect openvpn ~/vpn/work.ovpn
node scripts/vpn.mjs connect tailscale
node scripts/vpn.mjs disconnect windows OfficeVPN
node scripts/vpn.mjs status --json
```

Exit code `0` = success, `1` = failure or backend unavailable.

## Configuration

| Variable | Meaning | Default |
|---|---|---|
| `VPN_CONFIG_DIR` | WireGuard config directory | `/etc/wireguard` or `%ProgramFiles%\WireGuard\Data\Configurations` |
| `OPENVPN_CONFIG_DIR` | OpenVPN profile directory | `/etc/openvpn` or `%USERPROFILE%\OpenVPN\config` |

No credentials are ever read, written, or printed by this repo. Secrets remain in your VPN client's own configuration.

## Safety rules

1. Connect/disconnect only on an explicit user request.
2. Prefer permission prompts for state-changing actions.
3. Never commit passwords, keys, tokens, or auth URLs.
4. Never bypass employer/network policy.
5. If interactive browser login or admin rights are required, tell the user instead of trying to work around it.

## Development

```sh
node --check scripts/vpn.mjs
node --check mcp/server.mjs
node scripts/vpn.mjs help
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp/server.mjs
```

## License

MIT — see [LICENSE](LICENSE).

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-authored-by: Claude <noreply@anthropic.com>
