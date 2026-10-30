import { json } from '../../cloudflare/http.js'

// Cloudflare Pages route: GET /api/site-config
export function onRequest({ request, env }) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)
  const configured = Boolean(env.SEDIFEX_STORE_ID)
  return json({
    volunteer: configured && Boolean(env.SEDIFEX_VOLUNTEER_URL),
    support: configured && Boolean(env.SEDIFEX_SUPPORT_URL),
    donations: configured && env.DONATIONS_ENABLED === 'true' &&
      Boolean(env.SEDIFEX_API_BASE_URL && env.PUBLIC_SITE_URL),
  })
}
