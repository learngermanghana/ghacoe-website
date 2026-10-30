// Web-standard helpers for Cloudflare Pages Functions. No Node.js or Vercel APIs.
export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export class InvalidPayload extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

export function checkPostRequest(request) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!String(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return json({ error: 'JSON request required.' }, 415)
  }
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return json({ error: 'Request origin is not allowed.' }, 403)
      }
    } catch {
      return json({ error: 'Request origin is not allowed.' }, 403)
    }
  }
  const length = Number(request.headers.get('content-length'))
  if (Number.isFinite(length) && length > 16384) {
    return json({ error: 'Request is too large.' }, 413)
  }
  return null
}

export async function readPayload(request) {
  const source = await request.text()
  if (source.length > 16384) throw new InvalidPayload('Request is too large.', 413)
  let body
  try {
    body = JSON.parse(source)
  } catch {
    throw new InvalidPayload('Invalid JSON request.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InvalidPayload('JSON object required.')
  }
  return body
}
