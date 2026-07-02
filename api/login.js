// Password login is disabled — this dashboard is Google-only (@storeganise.com).
// Kept as a harmless stub; safe to delete this file.
export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response(null, { status: 303, headers: { Location: '/login' } });
}
