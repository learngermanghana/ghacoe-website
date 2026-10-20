import { checkRequest, contact, text, post, httpsUrl } from './_shared.js'
export default async function handler(req, res) {
  if (!checkRequest(req, res)) return
  const storeId = process.env.SEDIFEX_STORE_ID
  const base = process.env.SEDIFEX_API_BASE_URL
  if (!storeId || !base || process.env.DONATIONS_ENABLED !== 'true' || !process.env.PUBLIC_SITE_URL) return res.status(503).json({ error: 'Online donations are not open yet.' })
  const body = req.body || {}
  try {
    const endpoint = path => new URL(path, httpsUrl(base)).href
    if (body.action === 'verify') {
      const reference = text(body.reference, 140)
      if (!reference) return res.status(400).json({ error: 'Payment reference required.' })
      const { response, data } = await post(endpoint('/api/donations-payment-confirmation'), { storeId, reference })
      if (!response.ok || data.status !== 'captured') return res.status(409).json({ error: 'Donation verification is pending.' })
      return res.status(200).json({ ok: true })
    }
    let donor
    try { donor = contact(body) } catch (error) { return res.status(400).json({ error: error.message }) }
    const amount = Number(body.amount)
    if (!donor.email || !Number.isFinite(amount) || amount < 1 || amount > 100000) return res.status(400).json({ error: 'Enter an email address and a donation between GHS 1 and GHS 100,000.' })
    const returnUrl = new URL('/', httpsUrl(process.env.PUBLIC_SITE_URL))
    returnUrl.searchParams.set('donation', 'return')
    const { response, data } = await post(endpoint('/api/donor-portal-sync'), {
      storeId, donor, amount: Math.round(amount * 100) / 100, currency: 'GHS',
      initializePayment: true, returnUrl: returnUrl.href, sourceChannel: 'ghacoe-website',
      metadata: { message: text(body.message, 1000), consent: true },
    })
    if (!response.ok || !data.payment?.authorizationUrl) return res.status(502).json({ error: 'Unable to start secure checkout. Please try later.' })
    const checkout = httpsUrl(data.payment.authorizationUrl)
    if (checkout.hostname !== 'checkout.paystack.com') throw new Error('Invalid payment host')
    return res.status(200).json({ ok: true, authorizationUrl: checkout.href })
  } catch { return res.status(502).json({ error: 'The payment service is temporarily unavailable. Please try later.' }) }
}
