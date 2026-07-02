// Step 2 of Google sign-in: Google redirects back here with a code.
// Exchange it, verify the identity token, check the allow-list, then set our session cookie.
import { getCookie, makeToken, b64urlDecode, COOKIE, MAX_AGE } from '../../auth.js';

export const config = { runtime: 'edge' };

function decodeJwtPayload(jwt) {
  const parts = String(jwt || '').split('.');
  if (parts.length < 2) throw new Error('bad jwt');
  return JSON.parse(b64urlDecode(parts[1]));
}

export default async function handler(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(request, 'sg_oauth');

  const clearState = 'sg_oauth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
  const fail = (e = '1') =>
    new Response(null, { status: 303, headers: { Location: '/login?e=' + e, 'Set-Cookie': clearState } });

  // CSRF: state from Google must match the cookie we set in /api/auth/start
  if (!code || !state || !cookieState || state !== cookieState) return fail();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const secret = process.env.AUTH_SECRET || '';
  if (!clientId || !clientSecret || !secret) return new Response('Not configured.', { status: 500 });

  const redirectUri = url.origin + '/api/auth/callback';

  // Exchange the authorization code for tokens
  let tokenData;
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!res.ok) return fail();
    tokenData = await res.json();
  } catch (e) {
    return fail();
  }

  // The id_token came directly from Google over HTTPS. Validate its claims.
  let p;
  try { p = decodeJwtPayload(tokenData.id_token); } catch (e) { return fail(); }
  const issOk = p.iss === 'accounts.google.com' || p.iss === 'https://accounts.google.com';
  const nowSec = Date.now() / 1000;
  if (p.aud !== clientId) return fail();
  if (!issOk) return fail();
  if (!p.exp || nowSec > p.exp) return fail();
  if (p.email_verified !== true && p.email_verified !== 'true') return fail();

  const email = String(p.email || '').toLowerCase();

  // Only @storeganise.com Google accounts may access this dashboard.
  // (To change the allowed company later, edit ALLOWED_DOMAIN below.)
  const ALLOWED_DOMAIN = 'storeganise.com';
  if (!email.endsWith('@' + ALLOWED_DOMAIN)) return fail('2'); // valid Google login, wrong domain

  // Success — issue our own signed session cookie (same one the middleware checks)
  const token = await makeToken(email, secret);
  const headers = new Headers();
  headers.append('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`);
  headers.append('Set-Cookie', clearState);
  headers.set('Location', '/');
  return new Response(null, { status: 303, headers });
}
