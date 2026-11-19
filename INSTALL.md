# INSTALL.md — for agents

> **You are an agent.** The user gave you this repository URL (or attached it) and asked you to **install this skill**. Follow this guide exactly. Do not improvise credentials, do not assume a VPN exists, and do not modify unrelated files.

Repo: `https://github.com/A13dh/vpn-skill`

## 0. Confirm intent

The user must explicitly ask to install. If they only shared the link without a request, ask what they want to do.

Determine the **target project directory** (usually your current working directory). If the user named another directory, use that.

## 1. Get the repo

If you have shell access:

```sh
git clone --depth 1 https://github.com/A13dh/vpn-skill.git
```

If cloning is not possible, fetch `INSTALL.md`, `README.md`, `scripts/vpn.mjs`, `skills/vpn/SKILL.md`, `mcp/server.mjs`, and `.opencode/plugins/vpn/index.ts` from the URL and recreate them.

## 2. Run the installer

From the cloned repo:

```sh
node scripts/install.mjs --target "<target-project-dir>" --agent all
```

Options:

- `--agent opencode|claude|generic|mcp|all` (default `all`)
- `--target <dir>` (default current directory)
- `--dry-run` — show what would change without writing

The installer **never overwrites existing files**; it skips them and reports what was skipped.

## 3. What gets installed

| Agent | Files placed in target project |
|---|---|
| OpenCode | `.opencode/plugins/vpn/index.ts`, `.opencode/skills/vpn/SKILL.md`, `scripts/vpn.mjs` |
| Claude Code | `.claude/skills/vpn/SKILL.md`, `CLAUDE.md`, `.claude/settings.json` |
| Generic (Codex, Cursor, Gemini CLI, Windsurf, …) | `AGENTS.md`, `scripts/vpn.mjs` |
| MCP | Prints a stdio server config pointing to `mcp/server.mjs` |
| Perplexity | No native plugin API; use `perplexity/INSTRUCTIONS.md` or the MCP server |

If the project already has a `CLAUDE.md` or `AGENTS.md`, the installer skips it. Read the existing file and offer to append a short `vpn-skill` section **with the user's approval**.

## 4. OpenCode permissions (optional but recommended)

Merge this into the target project's `opencode.jsonc` without destroying existing settings:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "permissions": [
    { "action": "vpn_status", "effect": "allow" },
    { "action": "vpn_list", "effect": "allow" },
    { "action": "vpn_connect", "effect": "ask" },
    { "action": "vpn_disconnect", "effect": "ask" }
  ]
}
```

## 5. MCP client config (if requested)

Add to the user's MCP configuration (use an absolute path):

```json
{
  "mcpServers": {
    "vpn": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/mcp/server.mjs"]
    }
  }
}
```

## 6. Verify

```sh
node scripts/vpn.mjs status --json
```

Exit code 0 means backends are reachable; 1 means a backend is unavailable. Report exactly what the command prints.

## 7. Report to the user

Tell them:

1. Which agent targets were installed and where.
2. Which files were skipped because they already existed.
3. That no VPN client is bundled — they must have WireGuard, OpenVPN, Tailscale, or a Windows VPN connection already configured.
4. That connect/disconnect require their explicit request and permission approval.

## User-facing prompt template

Users can install by sending:

> Install this skill: https://github.com/A13dh/vpn-skill

You should then follow this file.
