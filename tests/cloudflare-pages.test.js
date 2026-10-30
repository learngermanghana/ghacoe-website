import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { onRequest as config } from '../functions/api/site-config.js'
import { onRequest as applications } from '../functions/api/applications.js'
import { onRequest as donations } from '../functions/api/donations.js'
import { checkPostRequest, readPayload } from '../cloudflare/http.js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

const env = (values = {}) => ({
  SEDIFEX_STORE_ID: 'ghacoe',
  SEDIFEX_VOLUNTEER_URL: 'https://functions.example/volunteerIntake',
  SEDIFEX_SUPPORT_URL: 'https://functions.example/supportRequestIntake',
  SEDIFEX_API_BASE_URL: 'https://sedifex.example',
  PUBLIC_SITE_URL: 'https://ghacoe.example',
  DONATIONS_ENABLED: 'false',
  ...values,
})
const req = (path, body, { origin = 'https://ghacoe.example', method = 'POST', headers = {} } = {}) =>
  new Request('https://ghacoe.example/api/' + path, {
    method, headers: { 'content-type': 'application/json', origin, ...headers },
    ...(['GET', 'HEAD'].includes(method) ? {} : { body: JSON.stringify(body) }),
  })
const data = async response => [response.status, await response.json()]

test('site configuration is off by default and honors enabled bindings', async () => {
  const response = config({ request: req('site-config', undefined, { method: 'GET' }), env: {} })
  assert.deepEqual(await data(response), [200, { volunteer: false, support: false, donations: false }])
  const enabled = config({ request: req('site-config', undefined, { method: 'GET' }),
    env: env({ DONATIONS_ENABLED: 'true' }) })
  assert.deepEqual(await data(enabled), [200, { volunteer: true, support: true, donations: true }])
  assert.equal((await data(config({ request: req('site-config', {}), env: env() })))[0], 405)
})

test('Pages rejects wrong HTTP methods, media types and cross-origin submissions', async () => {
  assert.equal((await data(await applications({ request: req('applications', undefined, { method: 'GET' }), env: env() })))[0], 405)
  assert.equal((await data(checkPostRequest(req('applications', {}, { headers: { 'content-type': 'text/plain' } }))))[0], 415)
  assert.equal((await data(await applications({ request: req('applications', {}, { origin: 'https://evil.example' }), env: env() })))[0], 403)
  assert.equal((await data(await applications({ request: req('applications', {}, { origin: 'not a URL' }), env: env() })))[0], 403)
})

test('Pages rejects malformed, non-object and oversized JSON', async () => {
  await assert.rejects(readPayload(new Request('https://ghacoe.example', { method: 'POST', body: '[1,2]' })), /object/)
  const malformed = new Request('https://ghacoe.example/api/applications', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
  })
  assert.deepEqual(await data(await applications({ request: malformed, env: env() })),
    [400, { error: 'Invalid JSON request.' }])
  const tooBig = req('applications', { message: 'x'.repeat(17000) })
  assert.equal((await data(await applications({ request: tooBig, env: env() })))[0], 413)
})

test('application intake uses configured GHACOE workspace and keeps visitor id ignored', async () => {
  let sent
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, 'https://functions.example/volunteerIntake')
    sent = JSON.parse(options.body)
    return { ok: true, status: 200, json: async () => ({ ok: true, id: 'ghacoe-submission' }) }
  }
  const response = await applications({ request: req('applications', {
    type: 'volunteer', name: 'Ama', email: 'AMA@example.com', consent: true,
    storeId: 'someone-else', skill: 'Teaching',
  }), env: env() })
  assert.deepEqual(await data(response), [200, { ok: true }])
  assert.equal(sent.storeId, 'ghacoe')
  assert.equal(sent.email, 'ama@example.com')
  assert.equal(sent.skill, 'Teaching')
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('training is routed to support and consent is required', async () => {
  let sent
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, 'https://functions.example/supportRequestIntake')
    sent = JSON.parse(options.body)
    return { ok: true, status: 200, json: async () => ({ ok: true, id: 'training' }) }
  }
  const invalid = await applications({ request: req('applications', {
    type: 'support', name: 'Ama', email: 'ama@example.com', supportType: 'Training',
  }), env: env() })
  assert.equal((await data(invalid))[0], 400)
  const good = await applications({ request: req('applications', {
    type: 'support', name: 'Ama', email: 'ama@example.com', consent: true,
    supportType: 'Training enquiry: Sewing',
  }), env: env() })
  assert.equal((await data(good))[0], 200)
  assert.equal(sent.supportType, 'Training enquiry: Sewing')
})

test('failed upstream application never reports success', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: 'rate limit' }) })
  const response = await applications({ request: req('applications', {
    type: 'volunteer', name: 'Ama', email: 'ama@example.com', consent: true,
  }), env: env() })
  assert.equal((await data(response))[0], 429)
})

test('donations remain off unless explicitly enabled', async () => {
  const response = await donations({ request: req('donations', { amount: 50 }), env: env() })
  assert.equal((await data(response))[0], 503)
})

test('donation checkout retains Paystack redirect and only uses configured workspace', async () => {
  let sent
  globalThis.fetch = async (url, options) => {
    assert.equal(url.pathname, '/api/donor-portal-sync')
    sent = JSON.parse(options.body)
    return { ok: true, json: async () => ({
      payment: { authorizationUrl: 'https://checkout.paystack.com/test-ref' },
    }) }
  }
  const response = await donations({ request: req('donations', {
    name: 'Ama', email: 'ama@example.com', consent: true, amount: 50, storeId: 'fake',
  }), env: env({ DONATIONS_ENABLED: 'true' }) })
  assert.deepEqual(await data(response), [200, {
    ok: true, authorizationUrl: 'https://checkout.paystack.com/test-ref',
  }])
  assert.equal(sent.storeId, 'ghacoe')
  assert.equal(sent.currency, 'GHS')
  assert.equal(sent.returnUrl, 'https://ghacoe.example/?donation=return')
})

test('donation verification asks Sedifex to check captured payment', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url.pathname, '/api/donations-payment-confirmation')
    assert.deepEqual(JSON.parse(options.body), { storeId: 'ghacoe', reference: 'DON-test' })
    return { ok: true, json: async () => ({ status: 'captured' }) }
  }
  const response = await donations({ request: req('donations', {
    action: 'verify', reference: 'DON-test',
  }), env: env({ DONATIONS_ENABLED: 'true' }) })
  assert.deepEqual(await data(response), [200, { ok: true }])
})

test('donations reject non-Paystack checkout hosts and pending payments', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    payment: { authorizationUrl: 'https://evil.example/checkout' },
  }) })
  const blocked = await donations({ request: req('donations', {
    name: 'Ama', email: 'ama@example.com', consent: true, amount: 50,
  }), env: env({ DONATIONS_ENABLED: 'true' }) })
  assert.equal((await data(blocked))[0], 502)
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ status: 'pending' }) })
  const pending = await donations({ request: req('donations', {
    action: 'verify', reference: 'DON-test',
  }), env: env({ DONATIONS_ENABLED: 'true' }) })
  assert.equal((await data(pending))[0], 409)
})
