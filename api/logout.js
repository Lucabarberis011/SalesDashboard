import { COOKIE } from '../auth.js';

export const config = { runtime: 'edge' };

export default async function handler() {
  const cookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  return new Response(null, { status: 303, headers: { Location: '/login', 'Set-Cookie': cookie } });
}
