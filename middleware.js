import { next } from '@vercel/functions';
import { getCookie, verifyToken, COOKIE } from './auth.js';

// Run on every path EXCEPT the login page, the auth API, and favicon/robots.
// Everything else (the dashboard) requires a valid session.
export const config = {
  matcher: ['/((?!api|login|favicon.ico|robots.txt).*)'],
};

export default async function middleware(request) {
  const secret = process.env.AUTH_SECRET || '';
  const token = getCookie(request, COOKIE);
  if (await verifyToken(token, secret)) {
    return next(); // authenticated -> serve the requested (static) file
  }
  return Response.redirect(new URL('/login', request.url), 307);
}
