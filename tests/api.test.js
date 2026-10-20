import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { contact, httpsUrl } from '../api/_shared.js'
import config from '../api/site-config.js'
import applications from '../api/applications.js'
import donations from '../api/donations.js'
const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }
afterEach(() => {
  globalThis.fetch = originalFetch
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
})
function response() {
  return { code: 200, data: null, setHeader() {}, status(code) { this.code = code; return this }, json(data) { this.data = data; return this } }
}
const request = body => ({ method: 'POST', headers: { 'content-type': 'application/json', host: 'ghacoe.example', origin: 'https://ghacoe.example' }, body })
test('contact requires consent and validates contact formats', () => {
  assert.throws(() => contact({ name: 'Ama', email: 'ama@example.com' }), /agree/)
  assert.throws(() => contact({ name: 'Ama', email: 'bad', consent: true }), /email/)
  assert.throws(() => contact({ name: 'Ama', phone: 'bad', consent: true }), /phone/)
  assert.equal(contact({ name: ' Ama ', email: 'AMA@example.com', consent: true }).email, 'ama@example.com')
})
test('connections are unavailable by default', () => {
  delete process.env.SEDIFEX_STORE_ID
  const res = response()
  config({ method: 'GET' }, res)
  assert.deepEqual(res.data, { volunteer: false, support: false, donations: false })
})
test('application proxy uses configured workspace rather than visitor input', async () => {
  process.env.SEDIFEX_STORE_ID = 'ghacoe'
  process.env.SEDIFEX_VOLUNTEER_URL = 'https://functions.example/volunteerIntake'
  let sent
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, process.env.SEDIFEX_VOLUNTEER_URL)
    sent = JSON.parse(options.body)
    return { ok: true, status: 200, json: async () => ({ ok: true, id: 'record' }) }
  }
  const res = response()
  await applications(request({ type: 'volunteer', storeId: 'another-workspace', name: 'Ama', email: 'ama@example.com', consent: true }), res)
  assert.equal(res.code, 200)
  assert.equal(sent.storeId, 'ghacoe')
  assert.equal(sent.consent, true)
})
test('application proxy rejects cross-origin submissions', async () => {
  const req = request({})
  req.headers.origin = 'https://elsewhere.example'
  const res = response()
  await applications(req, res)
  assert.equal(res.code, 403)
})
test('a failed upstream submission never reports success', async () => {
  process.env.SEDIFEX_STORE_ID = 'ghacoe'
  process.env.SEDIFEX_SUPPORT_URL = 'https://functions.example/support'
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: 'too-many' }) })
  const res = response()
  await applications(request({ type: 'support', name: 'Ama', email: 'ama@example.com', consent: true, supportType: 'Training' }), res)
  assert.equal(res.code, 429)
  assert.equal(res.data.ok, undefined)
})
test('donations stay unavailable until explicitly enabled', async () => {
  process.env.DONATIONS_ENABLED = 'false'
  const res = response()
  await donations(request({ amount: 100 }), res)
  assert.equal(res.code, 503)
})
test('payment callback asks Sedifex to verify the reference', async () => {
  Object.assign(process.env, { SEDIFEX_STORE_ID: 'ghacoe', SEDIFEX_API_BASE_URL: 'https://sedifex.example', DONATIONS_ENABLED: 'true', PUBLIC_SITE_URL: 'https://ghacoe.example' })
  globalThis.fetch = async (url, options) => {
    assert.equal(url.pathname, '/api/donations-payment-confirmation')
    assert.deepEqual(JSON.parse(options.body), { storeId: 'ghacoe', reference: 'DON-test' })
    return { ok: true, json: async () => ({ status: 'captured' }) }
  }
  const res = response()
  await donations(request({ action: 'verify', reference: 'DON-test', status: 'paid' }), res)
  assert.deepEqual(res.data, { ok: true })
})
test('upstream URLs must use HTTPS', () => {
  assert.throws(() => httpsUrl('http://example.com'), /HTTPS/)
})
