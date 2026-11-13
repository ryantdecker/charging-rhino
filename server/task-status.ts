import type { Task, TaskStatus } from '../src/types.ts'
import { asTaskStatus } from '../src/types.ts'

export function nowIso(): string {
  return new Date().toISOString()
}

export function applyStatus(
  item: Task,
  next: TaskStatus,
  refs?: { startRef?: string | null; doneRef?: string | null },
): void {
  const at = nowIso()
  item.status = next
  if (next === 'in_progress') {
    item.startedAt = item.startedAt ?? at
    if (refs?.startRef !== undefined) item.startRef = refs.startRef?.trim() || null
  }
  if (next === 'done') {
    item.doneAt = at
    if (refs?.doneRef !== undefined) item.doneRef = refs.doneRef?.trim() || null
  }
  if (next === 'open') {
    item.doneAt = null
  }
  item.updatedAt = at
}

export function parseStatusPatch(body: Record<string, unknown>): {
  status?: TaskStatus
  startRef?: string | null
  doneRef?: string | null
} {
  const status = asTaskStatus(body.status)
  const out: { status?: TaskStatus; startRef?: string | null; doneRef?: string | null } = {}
  if (status) out.status = status
  if (typeof body.startRef === 'string' || body.startRef === null) out.startRef = body.startRef
  if (typeof body.doneRef === 'string' || body.doneRef === null) out.doneRef = body.doneRef
  // Legacy clients
  if (!status && typeof body.done === 'boolean') out.status = body.done ? 'done' : 'open'
  return out
}
