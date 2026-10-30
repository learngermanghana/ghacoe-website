import { contact, text, post, httpsUrl } from '../../api/_shared.js'
import { checkPostRequest, InvalidPayload, json, readPayload } from '../../cloudflare/http.js'

// Cloudflare Pages route: POST /api/donations
export async function onRequest({ request, env }) {
  const rejected = checkPostRequest(request)
  if (rejected) return rejected
  const storeId = env.SEDIFEX_STORE_ID
  const base = env.SEDIFEX_API_BASE_URL
  if (!storeId || !base || env.DONATIONS_ENABLED !== 'true' || !env.PUBLIC_SITE_URL) {
    return json({ error: 'Online donations are not open yet.' }, 503)
  }
  let body
  try {
    body = await readPayload(request)
  } catch (error) {
    return json({ error: error instanceof InvalidPayload ? error.message : 'Invalid JSON request.' },
      error instanceof InvalidPayload ? error.status : 400)
  }
  try {
    const endpoint = path => new URL(path, httpsUrl(base)).href
    if (body.action === 'verify') {
      const reference = text(body.reference, 140)
      if (!reference) return json({ error: 'Payment reference required.' }, 400)
      const { response, data } = await post(endpoint('/api/donations-payment-confirmation'), { storeId, reference })
      if (!response.ok || data.status !== 'captured') {
        return json({ error: 'Donation verification is pending.' }, 409)
      }
      return json({ ok: true })
    }
    let donor
    try {
      donor = contact(body)
    } catch (error) {
      return json({ error: error.message }, 400)
    }
    const amount = Number(body.amount)
    if (!donor.email || !Number.isFinite(amount) || amount < 1 || amount > 100000) {
      return json({ error: 'Enter an email address and a donation between GHS 1 and GHS 100,000.' }, 400)
    }
    const returnUrl = new URL('/', httpsUrl(env.PUBLIC_SITE_URL))
    returnUrl.searchParams.set('donation', 'return')
    const { response, data } = await post(endpoint('/api/donor-portal-sync'), {
      storeId, donor, amount: Math.round(amount * 100) / 100, currency: 'GHS',
      initializePayment: true, returnUrl: returnUrl.href, sourceChannel: 'ghacoe-website',
      metadata: { message: text(body.message, 1000), consent: true },
    })
    if (!response.ok || !data.payment?.authorizationUrl) {
      return json({ error: 'Unable to start secure checkout. Please try later.' }, 502)
    }
    const checkout = httpsUrl(data.payment.authorizationUrl)
    if (checkout.hostname !== 'checkout.paystack.com') throw new Error('Invalid payment host')
    return json({ ok: true, authorizationUrl: checkout.href })
  } catch {
    return json({ error: 'The payment service is temporarily unavailable. Please try later.' }, 502)
  }
}
