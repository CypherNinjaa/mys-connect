/**
 * Where the mobile app finds the API.
 *
 * Production is trivial — one fixed HTTPS origin. Development is not, because
 * "the local server" is a different address depending on where the app runs:
 *
 *   Android emulator     10.0.2.2:3004    (the AVD's alias for the host loopback)
 *   Android device, USB  localhost:3004   (via `adb reverse tcp:3004 tcp:3004`)
 *   Android device, LAN  <dev LAN IP>     (10.0.2.2 is meaningless here)
 *   iOS simulator        localhost:3004   (shares the host network stack)
 *   iOS device           <dev LAN IP>
 *   Web                  localhost:3004
 *
 * No single value is correct everywhere, and the LAN IP changes with the
 * network, so this module does not try to guess once and hope. It builds an
 * ordered list of candidates, picks the best one synchronously so nothing ever
 * blocks on startup, then probes `/health` in the background and upgrades to a
 * candidate that actually answers if the first guess was wrong.
 *
 * `baseUrl` is therefore a getter, not a snapshot. Read it at call time.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** Must match the Express server's port (`server` config.port). */
const SERVER_PORT = 3004;

/** Path prefix every REST route lives under. */
const API_PREFIX = '/api/v1';

/** Used when `__DEV__` is false and no env override is set. */
const PRODUCTION_BASE_URL = 'https://api.mysranchi.org/api/v1';

/** How long a single health probe may take before that candidate is written off. */
const PROBE_TIMEOUT_MS = 2_500;

/**
 * The Android emulator cannot reach the host machine on `localhost` — that
 * resolves to the emulator itself. `10.0.2.2` is the AVD's alias for the host
 * loopback, and it is meaningless anywhere else: on a physical handset it is
 * just an unroutable address that fails every request. This is why it can never
 * be used unconditionally.
 */
const ANDROID_EMULATOR_HOST = '10.0.2.2';

const IS_WEB = Platform.OS === 'web';

/**
 * `Device.isDevice` is false on simulators and emulators. On web it reports
 * true, which is correct but not what we mean here, so web is excluded.
 */
const IS_SIMULATOR = !IS_WEB && !Device.isDevice;

// ---------------------------------------------------------------------------
// URL parsing
//
// Deliberately regex-based rather than using `URL`. React Native's `URL` is a
// partial implementation and has historically differed between engines; we only
// need scheme/host/port/path, which is well within what a regex handles safely.
// ---------------------------------------------------------------------------

const ENDPOINT_PATTERN =
  /^(?:(https?):\/\/)?(\[[^\]\s]+\]|[^/:\s]+)(?::(\d+))?(\/[^\s?#]*)?$/i;

interface Endpoint {
  scheme: string;
  host: string;
  port: string | null;
  path: string;
}

function parseEndpoint(raw: string): Endpoint | null {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  const match = ENDPOINT_PATTERN.exec(trimmed);
  if (!match) return null;

  const [, scheme, host, port, path] = match;
  return {
    scheme: (scheme ?? 'http').toLowerCase(),
    host,
    port: port ?? null,
    path: path ?? '',
  };
}

/** Strip IPv6 brackets so the host can be compared against known literals. */
function bareHost(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

/**
 * True for addresses that only make sense on a development machine or LAN.
 * Used to decide whether a missing port should be filled in with 3004 — we must
 * not append a dev port to a hosted URL that legitimately runs on 443.
 */
function isLocalAddress(host: string): boolean {
  const h = bareHost(host).toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (h.endsWith('.local')) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

/**
 * Whether this device can actually route to `host`.
 *
 * This is the check that makes a stale or platform-specific `.env` survivable
 * instead of fatal: a value pinned for one target is skipped on the others
 * rather than being used and silently failing every request.
 */
function isReachableFromHere(host: string): boolean {
  const h = bareHost(host).toLowerCase();

  if (h === ANDROID_EMULATOR_HOST) {
    return Platform.OS === 'android' && IS_SIMULATOR;
  }
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') {
    // Web and the iOS simulator share the host's network stack, so loopback
    // really is the dev machine.
    if (IS_WEB || (IS_SIMULATOR && Platform.OS !== 'android')) return true;

    // Loopback is *not* only a simulator address. On a USB-attached Android
    // device, `adb reverse tcp:3004 tcp:3004` tunnels the phone's own
    // localhost:3004 to the dev machine's port 3004. That path beats the LAN
    // IP: it survives switching Wi-Fi networks, works with Wi-Fi off entirely,
    // and is not subject to AP client isolation or the Windows firewall.
    //
    // The reverse tunnel cannot be detected from JS, so loopback stays a
    // candidate on Android hardware and the /health probe decides. With no
    // tunnel the connection is refused immediately — far cheaper than the
    // silent 2.5s timeout a firewalled LAN address costs.
    return Platform.OS === 'android' && !IS_SIMULATOR;
  }
  return true;
}

/**
 * Turn anything URL-shaped into a full base URL.
 *
 * Accepts bare hosts (`192.168.1.5`), host:port, and complete URLs; fills in the
 * scheme, the dev port, and the `/api/v1` prefix only where they are missing.
 * Returns null for input this device could never reach.
 */
function normalizeBaseUrl(raw: string): string | null {
  const parsed = parseEndpoint(raw);
  if (!parsed) return null;
  if (!isReachableFromHere(parsed.host)) return null;

  const { scheme, host, path } = parsed;

  // Only default the port for local addresses. A hosted URL without a port is
  // already complete and must be left alone.
  const port =
    parsed.port ?? (scheme === 'http' && isLocalAddress(host) ? String(SERVER_PORT) : null);

  const authority = port ? `${host}:${port}` : host;

  // Respect an explicit path (any `/api/vN`, or a mount under a sub-path);
  // supply the default prefix only when none was given.
  const suffix = path && path !== '/' ? path : API_PREFIX;

  return `${scheme}://${authority}${suffix}`;
}

/** `192.168.1.5:8081` → `192.168.1.5`. Handles a scheme and IPv6 brackets. */
function hostFromHostUri(hostUri: string): string | null {
  const stripped = hostUri.replace(/^[a-z]+:\/\//i, '').split('/')[0];
  const bracketed = /^\[([^\]]+)\]/.exec(stripped);
  if (bracketed) return bracketed[1];
  const host = stripped.split(':')[0];
  return host || null;
}

/**
 * The address Metro is being served from — in a dev build that is the dev
 * machine's LAN IP, which is the single most reliable signal available on a
 * physical device.
 *
 * `expo-constants` has moved this field twice across SDKs. The older locations
 * are not in its current type surface, so they are read through a narrow cast
 * rather than `any`.
 */
function getMetroHost(): string | null {
  const legacy = Constants as unknown as {
    manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
    manifest?: { debuggerHost?: string };
  };

  const hostUri =
    Constants.expoConfig?.hostUri ??
    legacy.manifest2?.extra?.expoGo?.debuggerHost ??
    legacy.manifest?.debuggerHost;

  return hostUri ? hostFromHostUri(hostUri) : null;
}

// ---------------------------------------------------------------------------
// Candidate list
// ---------------------------------------------------------------------------

/**
 * Every address worth trying, best first, with unreachable and duplicate
 * entries removed.
 *
 * The env var leads because an explicit override should win when it is usable.
 *
 * On Android hardware the `adb reverse` loopback comes next, ahead of the LAN
 * IP, for two reasons. It is more robust — unaffected by which Wi-Fi network
 * the phone is on, by AP client isolation, or by the Windows firewall. And it
 * is cheaper when wrong: an absent reverse tunnel refuses the connection
 * instantly, whereas a firewalled LAN address silently drops the packet and
 * burns the full probe timeout.
 *
 * The Metro host follows, since it is derived from a live connection rather
 * than assumed. Platform loopbacks are last-resort defaults.
 */
function buildCandidates(): string[] {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!__DEV__) {
    // Production never probes: one address, and a failure there is a real
    // outage rather than a misconfigured laptop.
    const normalized = envUrl ? normalizeBaseUrl(envUrl) : null;
    return [normalized ?? PRODUCTION_BASE_URL];
  }

  const metroHost = getMetroHost();
  const isAndroidHardware = Platform.OS === 'android' && !IS_SIMULATOR;

  const ordered = [
    envUrl ?? null,
    isAndroidHardware ? 'localhost' : null,
    metroHost,
    Platform.OS === 'android' ? ANDROID_EMULATOR_HOST : null,
    'localhost',
  ];

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const entry of ordered) {
    if (!entry) continue;
    const normalized = normalizeBaseUrl(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push(normalized);
  }

  // Every candidate was filtered out (an env var pinned to another platform and
  // no Metro connection, for instance). Fall back rather than hand back nothing.
  // 10.0.2.2 is only ever right on the emulator; on hardware, loopback at least
  // has a chance of working through an `adb reverse` tunnel.
  if (candidates.length === 0) {
    const fallbackHost =
      Platform.OS === 'android' && IS_SIMULATOR ? ANDROID_EMULATOR_HOST : 'localhost';
    candidates.push(`http://${fallbackHost}:${SERVER_PORT}${API_PREFIX}`);
  }

  return candidates;
}

const CANDIDATES = buildCandidates();

let activeBaseUrl: string = CANDIDATES[0];

// ---------------------------------------------------------------------------
// Health probing
// ---------------------------------------------------------------------------

/** `http://host:3004/api/v1` → `http://host:3004`. Mirrors the socket layer. */
export function originOf(baseUrl: string): string {
  return baseUrl.replace(/\/api\/v\d+\/?$/, '').replace(/\/+$/, '');
}

async function probe(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(`${originOf(baseUrl)}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const body: unknown = await res.json();
    return (body as { status?: string } | null)?.status === 'ok';
  } catch {
    // Unreachable, refused, timed out, or not our server. All the same to us.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const listeners = new Set<(baseUrl: string) => void>();

/**
 * Observe base-URL changes.
 *
 * Only fires when a probe corrects the initial guess, so in the common case
 * where the first candidate is right, it never fires at all.
 */
export function subscribeToBaseUrl(listener: (baseUrl: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setActiveBaseUrl(next: string): void {
  if (next === activeBaseUrl) return;
  activeBaseUrl = next;
  listeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // A misbehaving subscriber must not stop the others being told.
    }
  });
}

let resolution: Promise<string> | null = null;

/**
 * Probe every candidate and settle on one.
 *
 * Candidates are probed in parallel for speed but selected by list order, not
 * by who answers first — otherwise the chosen address could vary run to run
 * with network timing. If nothing answers, the initial guess is kept: the
 * server is probably just not running yet, and the existing network-error
 * screen already handles that case.
 */
async function resolveBaseUrl(): Promise<string> {
  if (CANDIDATES.length === 1) return activeBaseUrl;

  const results = await Promise.all(CANDIDATES.map(probe));
  const winner = CANDIDATES.find((_, index) => results[index]);

  if (winner) {
    if (winner !== activeBaseUrl && __DEV__) {
      console.log(`[NETWORK] Switched to reachable API at ${winner}`);
    }
    setActiveBaseUrl(winner);
  } else if (__DEV__) {
    const hint =
      Platform.OS === 'android' && !IS_SIMULATOR
        ? `\n  Over USB, run: adb reverse tcp:${SERVER_PORT} tcp:${SERVER_PORT}` +
          `\n  Over Wi-Fi, the phone must be on the same network and the Windows firewall must allow port ${SERVER_PORT}.`
        : '';
    console.warn(
      `[NETWORK] No candidate answered /health. Keeping ${activeBaseUrl}.\n` +
        `  Tried: ${CANDIDATES.join(', ')}\n` +
        `  Is the server running on port ${SERVER_PORT}?` +
        hint,
    );
  }

  return activeBaseUrl;
}

/**
 * Resolves once a reachable address has been chosen. Callers never have to
 * await this — `baseUrl` is usable immediately — but a startup gate can, to
 * avoid firing the first request at an address that is about to be corrected.
 */
export function whenNetworkReady(): Promise<string> {
  resolution ??= resolveBaseUrl();
  return resolution;
}

/**
 * Re-run resolution, e.g. from the retry button on the network-error screen
 * after the developer has started the server or switched networks.
 */
export function refreshBaseUrl(): Promise<string> {
  resolution = resolveBaseUrl();
  return resolution;
}

export const NETWORK_CONFIG = {
  /** Live value. Read at call time — this changes if a probe corrects it. */
  get baseUrl(): string {
    return activeBaseUrl;
  },
  /** Host of the active base URL, for diagnostics. */
  get devIp(): string {
    return parseEndpoint(activeBaseUrl)?.host ?? '';
  },
  /** Origin without the `/api/v1` prefix — what the socket connects to. */
  get origin(): string {
    return originOf(activeBaseUrl);
  },
  /** Everything that will be tried, in order. Surfaced for the error screen. */
  get candidates(): readonly string[] {
    return CANDIDATES;
  },
  port: SERVER_PORT,
  timeoutMs: 25_000,
};

if (__DEV__) {
  console.log(
    `[NETWORK] API ${activeBaseUrl}` +
      (CANDIDATES.length > 1 ? ` (${CANDIDATES.length} candidates, probing…)` : ''),
  );
  // Kick off resolution now so the correct address is usually in place before
  // the first authenticated request. Fire-and-forget: nothing blocks on it.
  void whenNetworkReady();
}
