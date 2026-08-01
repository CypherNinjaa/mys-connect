#!/usr/bin/env node
/**
 * Opens reverse tunnels from every attached Android device back to this machine.
 *
 *   phone:localhost:3004  ->  dev machine:3004   (the MYS API server)
 *   phone:localhost:8081  ->  dev machine:8081   (the Metro bundler)
 *
 * Why bother, when a LAN IP also works? Because the cable does not care about
 * the network. `adb reverse` survives switching Wi-Fi networks, works with
 * Wi-Fi off entirely, and is subject to neither AP client isolation nor the
 * Windows firewall. `src/config/network.config.ts` therefore tries
 * `localhost:3004` first on Android hardware.
 *
 * This script is chained ahead of `expo start` / `expo run:android`, so it must
 * NEVER fail the chain. No adb, no device, an unauthorized device, CI — every
 * one of those is a warning and exit 0. The app still falls back to the LAN IP.
 */

'use strict';

const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PORTS = [3004, 8081];

/** Locate adb: PATH first, then the usual SDK locations. */
function resolveAdb() {
  const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';

  try {
    execFileSync(exe, ['version'], { stdio: 'ignore' });
    return exe;
  } catch {
    // Not on PATH; fall through to the SDK guesses below.
  }

  const home = os.homedir();
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? path.join(home, 'AppData', 'Local'), 'Android', 'Sdk')
      : null,
    process.platform === 'darwin' ? path.join(home, 'Library', 'Android', 'sdk') : null,
    path.join(home, 'Android', 'Sdk'),
  ];

  for (const root of roots) {
    if (!root) continue;
    const candidate = path.join(root, 'platform-tools', exe);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** Serials of devices that are actually ready. Skips offline/unauthorized. */
function readyDevices(adb) {
  const out = execFileSync(adb, ['devices'], { encoding: 'utf8' });
  const devices = [];
  const skipped = [];

  // Line format: "<serial>\t<state>". The first line is a banner.
  for (const line of out.split(/\r?\n/).slice(1)) {
    const [serial, state] = line.trim().split(/\s+/);
    if (!serial || !state) continue;
    if (state === 'device') devices.push(serial);
    else skipped.push(`${serial} (${state})`);
  }

  if (skipped.length > 0) {
    console.warn(`[adb-reverse] Ignoring not-ready device(s): ${skipped.join(', ')}`);
    console.warn('[adb-reverse] Unlock the phone and accept the USB debugging prompt.');
  }
  return devices;
}

function main() {
  const adb = resolveAdb();
  if (!adb) {
    console.warn('[adb-reverse] adb not found — skipping USB tunnel.');
    console.warn('[adb-reverse] Install Android platform-tools or set ANDROID_HOME.');
    return;
  }

  const devices = readyDevices(adb);
  if (devices.length === 0) {
    console.warn('[adb-reverse] No Android device attached — skipping USB tunnel.');
    console.warn('[adb-reverse] The app will fall back to the LAN IP over Wi-Fi.');
    return;
  }

  for (const serial of devices) {
    for (const port of PORTS) {
      // `reverse` is idempotent: re-running just replaces the existing mapping.
      execFileSync(adb, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], {
        stdio: 'ignore',
      });
    }
    console.log(`[adb-reverse] ${serial}: localhost:${PORTS.join(', localhost:')} -> this machine`);
  }
}

try {
  main();
} catch (error) {
  // A broken tunnel must not stop the dev server from starting.
  console.warn(`[adb-reverse] Skipped: ${error instanceof Error ? error.message : String(error)}`);
}

process.exit(0);
