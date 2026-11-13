import { createSeed } from '../src/seed.ts'
import { guessAssist } from '../src/assist.ts'
import type { Board, Horizon, Prefs, Task, TaskStatus } from '../src/types.ts'
import { loadRawBoard, saveBoardIfRevision, saveRawBoard, storeKind } from './board-store.ts'

export { dataFile } from './board-store.ts'
/** @deprecated Projects are managed via UI/API; kept for any leftover imports. */
export const projectsRoot = ''

const starterTags: Record<string, string[]> = {
  dgg: ['disc golf'],
  'dg-tour': ['disc golf'],
  'asia-tour': ['disc golf'],
  'pdga-api': ['disc golf'],
  'service-flow': ['client'],
  crunchtime: ['client'],
  sahodar: ['client'],
  sgu: ['client'],
  jbq: ['personal'],
  'charging-rhino': ['personal'],
}

const defaultCatalog = ['disc golf', 'client', 'personal']

export function cleanTags(value: unknown[]): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of value) {
    const tag = String(raw).trim().replace(/\s+/g, ' ')
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
  }
  return tags
}

function mergeCatalog(existing: string[], extra: string[]): string[] {
  return cleanTags([...existing, ...extra])
}

function normalizePrefs(board: Board): Prefs {
  const horizon = board.prefs?.defaultHorizon
  const defaultHorizon: Horizon = horizon === 'day' || horizon === 'week' || horizon === 'month' ? horizon : 'month'
  const fromProjects = board.projects.flatMap((project) => project.tags ?? [])
  const tags = mergeCatalog(Array.isArray(board.prefs?.tags) ? board.prefs.tags : defaultCatalog, fromProjects)
  return { defaultHorizon, tags }
}

function migrateTaskStatus(task: Task & { done?: boolean }): TaskStatus {
  if (task.status === 'open' || task.status === 'in_progress' || task.status === 'done') return task.status
  if (task.done === true) return 'done'
  return 'open'
}

export function normalize(board: Board): Board {
  board.revision ??= 1
  board.syncedAt ??= null
  board.lastSync ??= null
  if (!Array.isArray(board.goals)) board.goals = []
  for (const project of board.projects) {
    if (!Array.isArray(project.tags)) project.tags = starterTags[project.id] ?? []
  }
  board.prefs = normalizePrefs(board)
  for (const task of board.tasks as Array<Task & { done?: boolean }>) {
    const score = Number(task.assist)
    if (!Number.isInteger(score) || score < 1 || score > 10) task.assist = guessAssist(task.title, task.note)
    task.status = migrateTaskStatus(task)
    delete task.done
    task.startedAt = task.startedAt ?? null
    task.startRef = task.startRef ?? null
    task.doneRef = task.doneRef ?? null
    if (task.status === 'done' && !task.doneAt) task.doneAt = task.updatedAt ?? new Date().toISOString()
    if (task.status !== 'done') task.doneAt = task.doneAt ?? null
    if (task.status === 'in_progress' && !task.startedAt) task.startedAt = task.updatedAt ?? new Date().toISOString()
    const fallback = task.doneAt || board.syncedAt || '2026-11-12T00:00:00.000Z'
    if (!task.createdAt || !Number.isFinite(Date.parse(task.createdAt))) task.createdAt = fallback
    if (!task.updatedAt || !Number.isFinite(Date.parse(task.updatedAt))) {
      task.updatedAt = task.doneAt && Date.parse(task.doneAt) >= Date.parse(task.createdAt) ? task.doneAt : task.createdAt
    }
  }
  return board
}

let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function readBoard(): Promise<Board> {
  const parsed = await loadRawBoard()
  if (!parsed || !Array.isArray(parsed.projects) || !Array.isArray(parsed.tasks)) {
    const seed = normalize(createSeed())
    await saveRawBoard(seed)
    return seed
  }
  return normalize(parsed)
}

export async function writeBoard(board: Board): Promise<void> {
  await saveRawBoard(board)
}

export function updateBoard(change: (board: Board) => void | Promise<void>): Promise<Board> {
  return enqueue(async () => {
    const maxAttempts = storeKind() === 'redis' ? 5 : 1
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const board = await readBoard()
      const expected = board.revision
      await change(board)
      board.revision = expected + 1
      const ok = await saveBoardIfRevision(board, expected)
      if (ok) return board
    }
    throw new Error('Could not save the board — try again.')
  })
}
