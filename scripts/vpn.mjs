#!/usr/bin/env node
// vpn-skill: dependency-free VPN control CLI used by the skill, plugins, and MCP server.
// No credentials are stored here. All secrets stay in your OS/VPN client config.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { platform } from "node:os";
import path from "node:path";

const IS_WIN = platform() === "win32";
const WG_DIR = process.env.VPN_CONFIG_DIR || (IS_WIN ? "C:\\Program Files\\WireGuard\\Data\\Configurations" : "/etc/wireguard");
const OVPN_DIR = process.env.OPENVPN_CONFIG_DIR || (IS_WIN ? path.join(process.env.USERPROFILE || "", "OpenVPN", "config") : "/etc/openvpn");

function run(cmd, args = []) {
  const r = spawnSync(cmd, args, { encoding: "utf8", windowsHide: true, shell: false });
  if (r.error) return { code: 127, out: "", err: r.error.message };
  return { code: r.status ?? 1, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function ps(script) {
  return run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
}

function onPath(cmd) {
  return run(IS_WIN ? "where.exe" : "which", [cmd]).code === 0;
}

function q(value) {
  return String(value).replaceAll("'", "''");
}

function configFiles(dir, ext) {
  try {
    return readdirSync(dir).filter((f) => f.toLowerCase().endsWith(ext));
  } catch {
    return [];
  }
}

function result(ok, backend, action, message, extra = {}) {
  return { ok, backend, action, message, ...extra };
}

const backends = {
  wireguard: {
    label: "WireGuard",
    available: () => onPath("wg") || onPath("wg.exe") || existsSync(WG_DIR),
    list() {
      const files = configFiles(WG_DIR, ".conf");
      return result(true, "wireguard", "list", files.length ? `Configs in ${WG_DIR}:\n${files.join("\n")}` : `No .conf files found in ${WG_DIR}`, { files });
    },
    status() {
      const r = run(onPath("wg") ? "wg" : "wg.exe", ["show"]);
      return result(r.code === 0, "wireguard", "status", r.code === 0 ? (r.out || "WireGuard is running; no active peers.") : `WireGuard status unavailable: ${r.err || r.out || "not running"}`);
    },
    connect(profile) {
      if (!profile) return result(false, "wireguard", "connect", "A tunnel name or .conf path is required.");
      if (IS_WIN) {
        const file = profile.toLowerCase().endsWith(".conf") ? profile : path.join(WG_DIR, profile.endsWith(".conf") ? profile : `${profile}.conf`);
        if (!existsSync(file)) return result(false, "wireguard", "connect", `Config not found: ${file}`);
        const r = run("wireguard.exe", ["/installtunnelservice", file]);
        return result(r.code === 0, "wireguard", "connect", r.code === 0 ? `Installed tunnel from ${file}` : r.err || r.out, { file });
      }
      const name = profile.replace(/\.conf$/i, "");
      const r = run("wg-quick", ["up", name]);
      return result(r.code === 0, "wireguard", "connect", r.code === 0 ? `Tunnel ${name} is up (may have required sudo).` : r.err || r.out, { name });
    },
    disconnect(profile) {
      if (!profile) return result(false, "wireguard", "disconnect", "A tunnel name is required.");
      const name = profile.replace(/\.conf$/i, "");
      const r = IS_WIN ? run("wireguard.exe", ["/uninstalltunnelservice", name]) : run("wg-quick", ["down", name]);
      return result(r.code === 0, "wireguard", "disconnect", r.code === 0 ? `Tunnel ${name} is down.` : r.err || r.out, { name });
    },
  },

  openvpn: {
    label: "OpenVPN",
    available: () => onPath("openvpn") || onPath("openvpn.exe") || configFiles(OVPN_DIR, ".ovpn").length > 0,
    list() {
      const files = configFiles(OVPN_DIR, ".ovpn");
      return result(true, "openvpn", "list", files.length ? `Profiles in ${OVPN_DIR}:\n${files.join("\n")}` : `No .ovpn files found in ${OVPN_DIR}`, { files });
    },
    status() {
      const r = IS_WIN
        ? ps("Get-Process openvpn -ErrorAction SilentlyContinue | Select-Object Id,ProcessName | ConvertTo-Json -Compress")
        : run("pgrep", ["-af", "openvpn"]);
      const active = IS_WIN ? r.out && r.out !== "[]" : r.code === 0 && r.out;
      return result(true, "openvpn", "status", active ? `OpenVPN process(es):\n${r.out}` : "No OpenVPN process appears to be running.");
    },
    connect(profile) {
      if (!profile) return result(false, "openvpn", "connect", "An .ovpn profile path is required.");
      const file = path.resolve(profile.toLowerCase().endsWith(".ovpn") ? profile : path.join(OVPN_DIR, `${profile}.ovpn`));
      if (!existsSync(file)) return result(false, "openvpn", "connect", `Profile not found: ${file}`);
      const r = IS_WIN
        ? ps(`Start-Process -FilePath 'openvpn.exe' -ArgumentList @('--config','${q(file)}') -WindowStyle Hidden`)
        : run("openvpn", ["--config", file, "--daemon"]);
      return result(r.code === 0, "openvpn", "connect", r.code === 0 ? `Started OpenVPN with ${file}` : r.err || r.out, { file });
    },
    disconnect(profile) {
      const r = IS_WIN
        ? ps("Stop-Process -Name openvpn -Force -ErrorAction SilentlyContinue")
        : run("pkill", ["-f", profile ? `openvpn.*${q(profile)}` : "openvpn"]);
      return result(r.code === 0, "openvpn", "disconnect", r.code === 0 ? "OpenVPN process stopped." : r.err || r.out);
    },
  },

  tailscale: {
    label: "Tailscale",
    available: () => onPath("tailscale") || onPath("tailscale.exe"),
    list() {
      const r = run(onPath("tailscale") ? "tailscale" : "tailscale.exe", ["status"]);
      return result(r.code === 0, "tailscale", "list", r.code === 0 ? r.out : r.err || r.out);
    },
    status() {
      const r = run(onPath("tailscale") ? "tailscale" : "tailscale.exe", ["status"]);
      return result(r.code === 0, "tailscale", "status", r.code === 0 ? (r.out || "Tailscale is idle.") : `Tailscale status unavailable: ${r.err || r.out}`);
    },
    connect() {
      const r = run(onPath("tailscale") ? "tailscale" : "tailscale.exe", ["up"]);
      return result(r.code === 0, "tailscale", "connect", r.code === 0 ? "Tailscale up command accepted. Finish login in the browser if prompted." : r.err || r.out);
    },
    disconnect() {
      const r = run(onPath("tailscale") ? "tailscale" : "tailscale.exe", ["down"]);
      return result(r.code === 0, "tailscale", "disconnect", r.code === 0 ? "Tailscale is down." : r.err || r.out);
    },
  },

  windows: {
    label: "Windows VPN (RAS)",
    available: () => IS_WIN,
    list() {
      if (!IS_WIN) return result(false, "windows", "list", "Windows RAS is only available on Windows.");
      const r = ps("Get-VpnConnection | Select-Object Name,ServerAddress,TunnelType,ConnectionStatus | ConvertTo-Json -Compress");
      return result(r.code === 0, "windows", "list", r.code === 0 ? (r.out || "No VPN connections configured.") : r.err || r.out);
    },
    status(profile) {
      if (!IS_WIN) return result(false, "windows", "status", "Windows RAS is only available on Windows.");
      const script = profile
        ? `Get-VpnConnection -Name '${q(profile)}' | Select-Object Name,ServerAddress,TunnelType,ConnectionStatus | ConvertTo-Json -Compress`
        : "Get-VpnConnection | Select-Object Name,ServerAddress,TunnelType,ConnectionStatus | ConvertTo-Json -Compress";
      const r = ps(script);
      return result(r.code === 0, "windows", "status", r.code === 0 ? (r.out || "No VPN connections configured.") : r.err || r.out);
    },
    connect(profile) {
      if (!IS_WIN) return result(false, "windows", "connect", "Windows RAS is only available on Windows.");
      if (!profile) return result(false, "windows", "connect", "A saved VPN connection name is required (see: list).");
      const r = run("rasdial.exe", [profile]);
      return result(r.code === 0, "windows", "connect", r.code === 0 ? `Connected to ${profile}.` : r.err || r.out, { profile });
    },
    disconnect(profile) {
      if (!IS_WIN) return result(false, "windows", "disconnect", "Windows RAS is only available on Windows.");
      if (!profile) return result(false, "windows", "disconnect", "A saved VPN connection name is required (see: list).");
      const r = run("rasdial.exe", [profile, "/DISCONNECT"]);
      return result(r.code === 0, "windows", "disconnect", r.code === 0 ? `Disconnected from ${profile}.` : r.err || r.out, { profile });
    },
  },
};

const aliases = { wg: "wireguard", wireguard: "wireguard", ovpn: "openvpn", openvpn: "openvpn", ts: "tailscale", tailscale: "tailscale", win: "windows", ras: "windows", windows: "windows" };

function help() {
  return [
    "vpn-skill — control VPN connections (no secrets stored here)",
    "",
    "Usage: node vpn.mjs <status|list|connect|disconnect|help> [backend] [profile] [--json]",
    "",
    "Backends: wireguard (wg), openvpn (ovpn), tailscale (ts), windows (win/ras)",
    "Aliases:  wg, ovpn, ts, win, ras",
    "",
    "Examples:",
    "  node vpn.mjs status                       # all backends",
    "  node vpn.mjs list windows --json",
    "  node vpn.mjs connect wireguard home",
    "  node vpn.mjs connect openvpn ~/vpn/work.ovpn",
    "  node vpn.mjs connect tailscale",
    "  node vpn.mjs disconnect windowsOffice",
    "",
    "Env: VPN_CONFIG_DIR, OPENVPN_CONFIG_DIR",
  ].join("\n");
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const clean = argv.filter((a) => a !== "--json");
  const [action, rawBackend, ...rest] = clean;
  const profile = rest.find((a) => !a.startsWith("--")) ?? null;

  if (!action || action === "help" || action === "--help" || action === "-h") {
    process.stdout.write(help() + "\n");
    return;
  }

  if (!["status", "list", "connect", "disconnect"].includes(action)) {
    const out = result(false, null, action, `Unknown action: ${action}. Run with help.`);
    process.stdout.write((json ? JSON.stringify(out) : `ERROR ${out.message}`) + "\n");
    process.exitCode = 1;
    return;
  }

  const outputs = [];
  const keys = rawBackend && rawBackend !== "all" ? [aliases[rawBackend.toLowerCase()] || rawBackend.toLowerCase()] : Object.keys(backends);

  for (const key of keys) {
    const backend = backends[key];
    if (!backend) {
      outputs.push(result(false, key, action, `Unknown backend: ${key}. Use wireguard|openvpn|tailscale|windows.`));
      continue;
    }
    if (!backend.available()) {
      outputs.push(result(false, key, action, `${backend.label} is not installed or configured on this machine.`));
      continue;
    }
    try {
      outputs.push(backend[action](profile));
    } catch (error) {
      outputs.push(result(false, key, action, error?.message || String(error)));
    }
  }

  const ok = outputs.every((o) => o.ok);
  const combined = {
    ok,
    action,
    backends: outputs,
    message: outputs.map((o) => `[${o.backend}] ${o.message}`).join("\n"),
  };

  if (json) {
    process.stdout.write(JSON.stringify(combined) + "\n");
  } else {
    process.stdout.write(`${ok ? "OK" : "ERROR"} ${action}\n${combined.message}\n`);
  }
  process.exitCode = ok ? 0 : 1;
}

main();
