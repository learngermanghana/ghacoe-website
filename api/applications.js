import { checkRequest, contact, text, post } from './_shared.js'
export default async function handler(req, res) {
  if (!checkRequest(req, res)) return
  const body = req.body || {}
  const endpoint = body.type === 'volunteer' ? process.env.SEDIFEX_VOLUNTEER_URL
    : body.type === 'support' ? process.env.SEDIFEX_SUPPORT_URL : null
  if (!endpoint || !process.env.SEDIFEX_STORE_ID) return res.status(503).json({ error: 'Online applications are not available yet.' })
  let person
  try { person = contact(body) } catch (error) { return res.status(400).json({ error: error.message }) }
  if (body.type === 'support' && !text(body.supportType, 160)) return res.status(400).json({ error: 'Please enter the type of support.' })
  try {
    const { response, data } = await post(endpoint, {
      ...person, storeId: process.env.SEDIFEX_STORE_ID,
      skill: text(body.skill), availability: text(body.availability),
      supportType: text(body.supportType, 160), needSummary: text(body.needSummary, 1000),
      notes: text(body.notes, 1000), website: '',
    })
    if (!response.ok || data.ok !== true || !data.id) return res.status(response.status === 429 ? 429 : 502).json({ error: response.status === 429 ? 'Too many requests. Please try again later.' : 'The ministry could not receive your request. Please try again.' })
    return res.status(200).json({ ok: true })
  } catch { return res.status(502).json({ error: 'Unable to connect to the ministry. Please try again later.' }) }
}
