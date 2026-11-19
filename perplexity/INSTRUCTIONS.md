# Using vpn-skill with Perplexity

Perplexity does not currently expose a general "agent plugin" API equivalent to Claude Code plugins or OpenCode plugins. This file is the portable bridge.

## Option A — Project/Space instructions

Paste the contents of `../skills/vpn/SKILL.md` into your Perplexity Space or project instructions. The skill is plain Markdown, so it works as instruction context.

## Option B — MCP tool

Perplexity clients that support MCP can launch the included stdio server:

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

Then the assistant can call `vpn_status`, `vpn_list`, `vpn_connect`, and `vpn_disconnect`.

## Important

The MCP server runs locally on the machine where it is launched. It cannot control a VPN on Perplexity's servers. It only controls the host that starts `node mcp/server.mjs`.
