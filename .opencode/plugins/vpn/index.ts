import { Plugin } from "@opencode/plugin"
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const cliCandidates = [
  // Repo layout: .opencode/plugins/vpn/index.ts -> ../../scripts/vpn.mjs
  path.resolve(here, "..", "..", "..", "scripts", "vpn.mjs"),
  // Project layout: copy plugin to .opencode/plugins/vpn/ and scripts/ to project root
  path.resolve(process.cwd(), "scripts", "vpn.mjs"),
]
const cli = cliCandidates.find(existsSync) ?? cliCandidates[0]

type VpnInput = { backend?: string; profile?: string }

function callVpn(args: string[]): string {
  const r = spawnSync(process.execPath, [cli, ...args, "--json"], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  })
  if (r.error) throw r.error
  return (r.stdout || r.stderr || "").trim() || "No output from vpn CLI"
}

function argsFor(input: VpnInput): string[] {
  const args: string[] = []
  if (input.backend) args.push(input.backend)
  if (input.profile) args.push(input.profile)
  return args
}

const toolInput = {
  type: "object" as const,
  properties: {
    backend: {
      type: "string" as const,
      enum: ["wireguard", "wg", "openvpn", "ovpn", "tailscale", "ts", "windows", "win", "ras"],
      description: "VPN backend. Omit to check all backends.",
    },
    profile: {
      type: "string" as const,
      description: "Tunnel name, saved connection name, or .ovpn/.conf path.",
    },
  },
  additionalProperties: false as const,
}

export default Plugin.define({
  id: "vpn-skill",
  async setup(ctx) {
    await ctx.tool.transform((editor) => {
      editor.namespace({
        name: "vpn",
        description: "VPN connection control (WireGuard, OpenVPN, Tailscale, Windows RAS)",
      })

      editor.add({
        name: "status",
        description: "Show VPN status. Omit backend to check every available backend.",
        input: toolInput,
        options: { namespace: "vpn", codemode: true },
        execute: async (input) => ({ content: callVpn(["status", ...argsFor(input as VpnInput)]) }),
      })

      editor.add({
        name: "list",
        description: "List configured VPN profiles/tunnels for a backend.",
        input: toolInput,
        options: { namespace: "vpn", codemode: true },
        execute: async (input) => ({ content: callVpn(["list", ...argsFor(input as VpnInput)]) }),
      })

      for (const action of ["connect", "disconnect"] as const) {
        editor.add({
          name: action,
          description: `${action[0].toUpperCase()}${action.slice(1)} a VPN tunnel. Requires explicit user permission.`,
          input: toolInput,
          options: { namespace: "vpn", codemode: true },
          execute: async (input, toolContext) => {
            await ctx.permission.assert({
              sessionID: toolContext.sessionID,
              agent: toolContext.agent,
              source: { type: "tool", messageID: toolContext.messageID, id: toolContext.id },
              action: `vpn_${action}`,
              resources: [String((input as VpnInput).backend ?? "all"), String((input as VpnInput).profile ?? "")],
              save: [String((input as VpnInput).backend ?? "all")],
            })
            return { content: callVpn([action, ...argsFor(input as VpnInput)]) }
          },
        })
      }
    })
  },
})
