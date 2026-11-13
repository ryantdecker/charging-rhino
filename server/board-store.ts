import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Board } from '../src/types.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const dataFile = path.join(root, 'data', 'board.json')

const BOARD_KEY = 'rhino:board'

export type StoreKind = 'file' | 'redis'

export function storeKind(): StoreKind {
  const raw = (process.env.RHINO_STORE ?? 'file').toLowerCase()
  return raw === 'redis' ? 'redis' : 'file'
}

async function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for redis store.')
  const { Redis } = await import('@upstash/redis')
  return new Redis({ url, token })
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
