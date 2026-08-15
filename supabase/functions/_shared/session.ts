// Shared by staff-login, staff-admin, and save-kv. Nothing here ever runs
// in the browser — it's only imported into edge functions, which hold the
// SESSION_SECRET and service-role key that make it work.

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/** Sign a session payload into a compact, tamper-proof token. */
export async function signSession(payload: Record<string, unknown>, secret: string): Promise<string> {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(body)));
  return `${body}.${bytesToBase64Url(sig)}`;
}

/** Verify a token's signature and expiry. Returns the payload, or null. */
export async function verifySession(token: string | null | undefined, secret: string): Promise<any | null> {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlToBytes(sig), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

/** PBKDF2-SHA256, 100k iterations. Returns hex-encoded salt + hash. */
export async function hashPin(pin: string, saltHex?: string): Promise<{ salt: string; hash: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { salt: bytesToHex(salt), hash: bytesToHex(new Uint8Array(bits)) };
}

export async function verifyPin(pin: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  const { hash } = await hashPin(pin, saltHex);
  return timingSafeEqual(hash, expectedHashHex);
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
