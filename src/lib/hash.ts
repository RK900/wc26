// SHA-256 with random per-doc salt via Web Crypto. Bcrypt is overkill for this
// app's threat model (the goal is "leaked Firestore export ≠ leaked passwords",
// not "resist offline attack"). Document this in README.

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function generateSaltB64(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToB64(bytes);
}

export function generateTokenB64(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  // URL-safe base64
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashWithSalt(plaintext: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(saltB64 + ':' + plaintext);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return bytesToB64(new Uint8Array(buf));
}

export async function verifyHash(
  plaintext: string,
  saltB64: string,
  hashB64: string,
): Promise<boolean> {
  const computed = await hashWithSalt(plaintext, saltB64);
  return computed === hashB64;
}
