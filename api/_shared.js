export function text(value, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}
export function httpsUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:') throw new Error('HTTPS endpoint required')
  return url
}
export function checkRequest(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed.' }); return false }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    res.status(415).json({ error: 'JSON request required.' }); return false
  }
  const origin = req.headers.origin
  if (origin && new URL(origin).host !== req.headers.host) {
    res.status(403).json({ error: 'Request origin is not allowed.' }); return false
  }
  return true
}
export async function post(url, payload) {
  const response = await fetch(httpsUrl(url), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
  })
  const data = await response.json()
  return { response, data }
}
export function contact(body) {
  const name = text(body.name, 140)
  const email = text(body.email).toLowerCase()
  const phone = text(body.phone, 25)
  if (!name || (!email && !phone)) throw new Error('Enter your name and an email address or phone number.')
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.')
  if (phone && !/^\+?[0-9 ()-]{8,25}$/.test(phone)) throw new Error('Enter a valid phone number.')
  if (body.consent !== true) throw new Error('Please agree to follow-up contact before submitting.')
  if (text(body.website)) throw new Error('Submission blocked.')
  return { name, email, phone, consent: true }
}
