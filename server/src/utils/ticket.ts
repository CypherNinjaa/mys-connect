import crypto from 'crypto';

/**
 * Event ticket helpers: registration-code minting and QR payload signing.
 *
 * A ticket has two independent presentations of the same identity:
 *   1. `registrationCode` — short, spoken/typed by a volunteer at the gate when
 *      scanning fails. Optimised for a human reading it off a phone screen.
 *   2. the QR payload — the signed form, scanned normally.
 *
 * Both resolve to the same `EventRSVP` row, so the manual path is a fallback,
 * never a second source of truth.
 */

/**
 * Alphabet for registration codes.
 *
 * Deliberately excludes every glyph pair that gets misread aloud or on a
 * cracked screen: `O`/`0`, `I`/`1`/`L`. Removing them beats colour-coding them,
 * because ambiguity that cannot occur needs no explaining at the gate. The app
 * still colours letters and digits differently, and still flags a stray `O`/`0`
 * if a legacy or hand-entered code ever contains one.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Characters per group, and group count, in `MYS-XXXX-XXXX`. */
const GROUP_SIZE = 4;
const GROUP_COUNT = 2;

/** Marks the payload format so a future scanner can reject unknown versions. */
const PAYLOAD_PREFIX = 'MYSC1';

/** Truncated HMAC length (base64url chars) carried in the QR payload. */
const SIGNATURE_LENGTH = 16;

/**
 * Draws `count` characters from `CODE_ALPHABET` without modulo bias.
 *
 * `randomInt` is rejection-sampled internally, so an alphabet length that does
 * not divide 256 stays uniform — which matters here, since 31 does not.
 */
function randomGroup(count: number): string {
  let out = '';
  for (let i = 0; i < count; i += 1) {
    out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Mints a candidate registration code, e.g. `MYS-7K4Q-C9XB`.
 *
 * 31^8 ≈ 8.5e11 combinations. Uniqueness is still enforced by the database's
 * unique index; the caller retries on collision rather than trusting entropy.
 */
export function generateRegistrationCode(): string {
  const groups: string[] = [];
  for (let i = 0; i < GROUP_COUNT; i += 1) {
    groups.push(randomGroup(GROUP_SIZE));
  }
  return `MYS-${groups.join('-')}`;
}

/**
 * Secret used to sign QR payloads.
 *
 * Prefers an explicit `QR_SIGNING_SECRET`. When unset, derives a stable key
 * from existing server secrets so local development works with no extra setup —
 * but refuses to start in production, where a predictable key would let anyone
 * forge a ticket. Never logged or returned to a client.
 */
function getSigningSecret(): string {
  const explicit = process.env.QR_SIGNING_SECRET;
  if (explicit && explicit.trim().length > 0) return explicit.trim();

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'QR_SIGNING_SECRET must be set in production so event QR codes cannot be forged.'
    );
  }

  const derived = process.env.CLERK_SECRET_KEY || process.env.DATABASE_URL;
  if (!derived) {
    throw new Error('Cannot derive a QR signing secret: set QR_SIGNING_SECRET.');
  }
  return crypto.createHash('sha256').update(`mys-qr:${derived}`).digest('hex');
}

/** Signs `eventId` + `code`, so a payload is only valid for its own event. */
function sign(eventId: string, code: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${eventId}:${code}`)
    .digest('base64url')
    .slice(0, SIGNATURE_LENGTH);
}

/**
 * Builds the string encoded into the QR image:
 * `MYSC1:<eventId>:<registrationCode>:<signature>`.
 *
 * Carrying the event id lets a scanner reject a valid ticket presented at the
 * wrong gate, and the signature makes the payload tamper-evident without a
 * database round trip — useful for the future volunteer app on a weak network.
 */
export function buildQrPayload(eventId: string, code: string): string {
  return `${PAYLOAD_PREFIX}:${eventId}:${code}:${sign(eventId, code)}`;
}

export interface ParsedQrPayload {
  eventId: string;
  registrationCode: string;
}

/**
 * Verifies and decodes a scanned payload, or returns `null` if it is malformed,
 * an unknown version, or incorrectly signed.
 *
 * Provided now so the volunteer scanner has a single verification path to call
 * later; the check-in endpoint itself is intentionally still to be built.
 */
export function parseQrPayload(payload: string): ParsedQrPayload | null {
  if (typeof payload !== 'string') return null;

  const parts = payload.trim().split(':');
  if (parts.length !== 4) return null;

  const [prefix, eventId, registrationCode, signature] = parts;
  if (prefix !== PAYLOAD_PREFIX) return null;
  if (!eventId || !registrationCode || !signature) return null;

  const expected = sign(eventId, registrationCode);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length) return null;
  if (!crypto.timingSafeEqual(given, want)) return null;

  return { eventId, registrationCode };
}

/**
 * Normalises a code typed by a volunteer: upper-cases, strips separators and
 * whitespace, then re-groups so `mys 7k4qc9xb` matches `MYS-7K4Q-C9XB`.
 *
 * Deliberately does not "correct" look-alikes. Because `O`, `0`, `I`, `1` and
 * `L` are absent from `CODE_ALPHABET`, folding them onto a valid glyph would be
 * a guess between candidates (`0` → `Q`? `D`?) that is wrong about as often as
 * it is right, and a wrong guess can only mint a code belonging to nobody — or,
 * worse, to somebody else. A miss the volunteer can see and retype is safer
 * than a silent substitution.
 */
export function normalizeRegistrationCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^0-9A-Z]/g, '');

  if (!cleaned.startsWith('MYS')) return cleaned;
  const body = cleaned.slice(3);
  const groups = body.match(/.{1,4}/g) ?? [];
  return `MYS-${groups.join('-')}`;
}
