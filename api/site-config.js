export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })
  const configured = Boolean(process.env.SEDIFEX_STORE_ID)
  res.status(200).json({
    volunteer: configured && Boolean(process.env.SEDIFEX_VOLUNTEER_URL),
    support: configured && Boolean(process.env.SEDIFEX_SUPPORT_URL),
    donations: configured && process.env.DONATIONS_ENABLED === 'true' && Boolean(process.env.SEDIFEX_API_BASE_URL && process.env.PUBLIC_SITE_URL),
  })
}
