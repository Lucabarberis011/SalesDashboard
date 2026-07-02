// Step 1 of Google sign-in: send the user to Google's consent screen.
export const config = { runtime: 'edge' };

export default async function handler(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return new Response('Google login is not configured.', { status: 500 });

  const origin = new URL(request.url).origin;
  const redirectUri = origin + '/api/auth/callback';
  const state = crypto.randomUUID().replace(/-/g, '');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  params.set('hd', 'storeganise.com'); // restrict Google's account picker to the Storeganise Workspace

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
  // short-lived signed-by-randomness state cookie for CSRF protection
  const stateCookie = `sg_oauth=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return new Response(null, { status: 303, headers: { Location: authUrl, 'Set-Cookie': stateCookie } });
}
