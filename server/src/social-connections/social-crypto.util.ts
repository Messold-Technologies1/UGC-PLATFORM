import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

/**
 * Small crypto helpers for the social-connections module:
 *  - `encryptSecret` / `decryptSecret` — AES-256-GCM at-rest encryption for the
 *    OAuth tokens stored on `SocialConnection`. Never store raw tokens.
 *  - `signState` / `verifyState` — HMAC-signed, self-contained OAuth `state` so
 *    the callback can identify the creator without a session lookup and reject
 *    tampered/stale values (CSRF + integrity).
 *
 * All of these derive a 32-byte key from `SOCIAL_TOKEN_ENC_KEY` via SHA-256, so
 * the env var can be any sufficiently long string (hex, base64, or passphrase).
 */

const ENC_VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function deriveKey(rawKey: string): Buffer {
  return createHash('sha256').update(rawKey, 'utf8').digest();
}

export function encryptSecret(plaintext: string, rawKey: string): string {
  const key = deriveKey(rawKey);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENC_VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    enc.toString('base64'),
  ].join(':');
}

export function decryptSecret(ciphertext: string, rawKey: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 4 || parts[0] !== ENC_VERSION) {
    throw new Error('Malformed encrypted secret');
  }
  const key = deriveKey(rawKey);
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const data = Buffer.from(parts[3], 'base64');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export interface OAuthStatePayload {
  /** Creator profile initiating the connect. */
  cpid: string;
  /** Owning user id (defence in depth). */
  uid: string;
  /** Random nonce; also mirrored in a cookie for CSRF. */
  nonce: string;
  /** Issued-at (ms epoch). */
  iat: number;
}

export function signState(
  payload: Omit<OAuthStatePayload, 'iat' | 'nonce'>,
  rawKey: string,
): { state: string; nonce: string } {
  const nonce = randomBytes(16).toString('hex');
  const full: OAuthStatePayload = { ...payload, nonce, iat: Date.now() };
  const body = base64url(Buffer.from(JSON.stringify(full), 'utf8'));
  const sig = base64url(
    createHmac('sha256', deriveKey(rawKey)).update(body).digest(),
  );
  return { state: `${body}.${sig}`, nonce };
}

/**
 * Verify signature + freshness. Returns the payload or throws. `maxAgeMs`
 * defaults to 10 minutes, matching the OAuth state cookie lifetime.
 */
export function verifyState(
  state: string,
  rawKey: string,
  maxAgeMs = 10 * 60_000,
): OAuthStatePayload {
  const dot = state.lastIndexOf('.');
  if (dot <= 0) throw new Error('Malformed state');
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = base64url(
    createHmac('sha256', deriveKey(rawKey)).update(body).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid state signature');
  }
  const payload = JSON.parse(
    fromBase64url(body).toString('utf8'),
  ) as OAuthStatePayload;
  if (typeof payload.iat !== 'number' || Date.now() - payload.iat > maxAgeMs) {
    throw new Error('Expired state');
  }
  return payload;
}
