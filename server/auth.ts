import type { IncomingMessage, ServerResponse } from 'node:http'

const COOKIE = 'rhino_auth'

function password(): string {
  return process.env.RHINO_PASSWORD?.trim() ?? ''
}

export function authEnabled(): boolean {
  return password().length > 0
}

export function extractToken(req: IncomingMessage): string {
  const header = req.headers.authorization ?? ''
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim()
  if (header.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8')
      const idx = decoded.indexOf(':')
      return idx >= 0 ? decoded.slice(idx + 1) : decoded
    } catch {
      return ''
    }
  }
  const cookie = req.headers.cookie ?? ''
  const match = cookie.match(/(?:^|;\s*)rhino_auth=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function isAuthorized(req: IncomingMessage): boolean {
  if (!authEnabled()) return true
  return extractToken(req) === password()
}

export function setAuthCookie(res: ServerResponse): void {
  const secure = process.env.VERCEL ? '; Secure' : ''
  res.setHeader(
    'set-cookie',
    `${COOKIE}=${encodeURIComponent(password())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`,
  )
}

export function clearAuthCookie(res: ServerResponse): void {
  res.setHeader('set-cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}
