import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Board } from '../src/types.ts'

/** Avoid import.meta — Vercel may bundle API as CJS and crash every function on load. */
export const dataFile = process.env.RHINO_DATA_FILE ?? path.join(process.cwd(), 'data', 'board.json')

const BOARD_KEY = 'rhino:board'

export type StoreKind = 'file' | 'redis'

function redisCreds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return { url, token }
}

export function storeKind(): StoreKind {
  const raw = (process.env.RHINO_STORE ?? '').toLowerCase()
  if (raw === 'file') return 'file'
  if (raw === 'redis') return 'redis'
  // Vercel + Upstash Marketplace: use Redis whenever credentials exist
  return redisCreds() ? 'redis' : 'file'
}

async function redis() {
  const creds = redisCreds()
  if (!creds) {
    throw new Error(
      'Redis store needs UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN).',
    )
  }
  const { Redis } = await import('@upstash/redis')
  return new Redis(creds)
}

export async function loadRawBoard(): Promise<Board | null> {
  if (storeKind() === 'redis') {
    const client = await redis()
    const value = await client.get<Board | string>(BOARD_KEY)
    if (value == null) return null
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Board
      } catch {
        return null
      }
    }
    return value
  }

  try {
    const raw = await readFile(dataFile, 'utf8')
    return JSON.parse(raw) as Board
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

export async function saveRawBoard(board: Board): Promise<void> {
  if (storeKind() === 'redis') {
    const client = await redis()
    await client.set(BOARD_KEY, board)
    return
  }
  await mkdir(path.dirname(dataFile), { recursive: true })
  const tmp = `${dataFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tmp, JSON.stringify(board, null, 2))
  await rename(tmp, dataFile)
}

/** Compare-and-swap by revision. Returns false if the stored revision changed. */
export async function saveBoardIfRevision(board: Board, expectedRevision: number): Promise<boolean> {
  const existing = await loadRawBoard()
  if (existing && existing.revision !== expectedRevision) return false
  await saveRawBoard(board)
  return true
}
