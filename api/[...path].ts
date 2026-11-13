import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Readable } from 'node:stream'
import { handleApi } from '../server/handle'

export const config = {
  api: {
    bodyParser: false,
  },
}

/** Ensure a readable body stream when Vercel has already buffered JSON. */
function asIncoming(req: VercelRequest): VercelRequest {
  if (req.body == null || Buffer.isBuffer(req.body) || typeof (req as { readable?: boolean }).readable === 'boolean') {
    return req
  }
  const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  const stream = Readable.from([Buffer.from(raw)])
  Object.assign(stream, {
    headers: req.headers,
    method: req.method,
    url: req.url,
  })
  return stream as unknown as VercelRequest
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const handled = await handleApi(asIncoming(req), res)
    if (!handled) {
      res.statusCode = 404
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    console.error('[rhino api]', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: message }))
    }
  }
}
