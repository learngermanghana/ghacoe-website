import { contact, text, post } from '../../api/_shared.js'
import { checkPostRequest, InvalidPayload, json, readPayload } from '../../cloudflare/http.js'

// Cloudflare Pages route: POST /api/applications
export async function onRequest({ request, env }) {
  const rejected = checkPostRequest(request)
  if (rejected) return rejected
  let body
  try {
    body = await readPayload(request)
  } catch (error) {
    return json({ error: error instanceof InvalidPayload ? error.message : 'Invalid JSON request.' },
      error instanceof InvalidPayload ? error.status : 400)
  }
  const endpoint = body.type === 'volunteer' ? env.SEDIFEX_VOLUNTEER_URL
    : body.type === 'support' ? env.SEDIFEX_SUPPORT_URL : null
  if (!endpoint || !env.SEDIFEX_STORE_ID) {
    return json({ error: 'Online applications are not available yet.' }, 503)
  }
  let person
  try {
    person = contact(body)
  } catch (error) {
    return json({ error: error.message }, 400)
  }
  if (body.type === 'support' && !text(body.supportType, 160)) {
    return json({ error: 'Please enter the type of support.' }, 400)
  }
  try {
    const { response, data } = await post(endpoint, {
      ...person, storeId: env.SEDIFEX_STORE_ID,
      skill: text(body.skill), availability: text(body.availability),
      supportType: text(body.supportType, 160), needSummary: text(body.needSummary, 1000),
      notes: text(body.notes, 1000), website: '',
    })
    if (!response.ok || data.ok !== true || !data.id) {
      const throttled = response.status === 429
      return json({ error: throttled ? 'Too many requests. Please try again later.' :
        'The ministry could not receive your request. Please try again.' }, throttled ? 429 : 502)
    }
    return json({ ok: true })
  } catch {
    return json({ error: 'Unable to connect to the ministry. Please try again later.' }, 502)
  }
}
