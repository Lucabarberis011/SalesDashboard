// Shared auth helpers — Edge-compatible (Web Crypto). No external deps.
const enc = new TextEncoder();

export const COOKIE = 'sg_session';
export const MAX_AGE = 86400; // session length in seconds (24h)

export function b64urlEncode(str) {
  const bytes = enc.encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function hmacHex(data, secret) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function getCookie(request, name) {
  const c = request.headers.get('cookie') || '';
  for (const part of c.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

// AUTH_USERS accepts JSON  {"boss@co.com":"pass1","luca@co.com":"pass2"}
// or a simple list       boss@co.com:pass1, luca@co.com:pass2   (comma/newline separated)
export function parseUsers(raw) {
  const out = {};
  if (!raw) return out;
  raw = raw.trim();
  try {
    const j = JSON.parse(raw);
    for (const k in j) out[k.trim().toLowerCase()] = String(j[k]);
    return out;
  } catch (e) { /* fall through to simple format */ }
  for (const line of raw.split(/[\n,]+/)) {
    const s = line.trim();
    if (!s) continue;
    const i = s.indexOf(':');
    if (i < 0) continue;
    out[s.slice(0, i).trim().toLowerCase()] = s.slice(i + 1);
  }
  return out;
}

export async function makeToken(email, secret) {
  const exp = Date.now() + MAX_AGE * 1000;
  const sig = await hmacHex(email + '|' + exp, secret);
  return b64urlEncode(email + '|' + exp + '|' + sig);
}

export async function verifyToken(token, secret) {
  if (!token || !secret) return false;
  let raw;
  try { raw = b64urlDecode(token); } catch (e) { return false; }
  const parts = raw.split('|');
  if (parts.length !== 3) return false;
  const [email, exp, sig] = parts;
  if (!/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  const expected = await hmacHex(email + '|' + exp, secret);
  return timingSafeEqual(sig, expected);
}
