import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Readable } from 'node:stream'
import { handleApi } from '../server/handle.ts'

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
  process.env.RHINO_STORE ??= 'redis'
  const handled = await handleApi(asIncoming(req), res)
  if (!handled) {
    res.statusCode = 404
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end('Not found')
  }
}
