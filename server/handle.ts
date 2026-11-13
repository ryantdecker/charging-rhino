import type { IncomingMessage, ServerResponse } from 'node:http'
import { createSeed } from '../src/seed.ts'
import { guessAssist } from '../src/assist.ts'
import type { Board, Goal, Horizon, Lane, ProjectStatus } from '../src/types.ts'
import { cleanTags, readBoard, updateBoard } from './document.ts'
import { authEnabled, clearAuthCookie, isAuthorized, setAuthCookie } from './auth.ts'
import { applyStatus, nowIso, parseStatusPatch } from './task-status.ts'

async function readyBoard(): Promise<Board> {
  return readBoard()
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = typeof body === 'string' ? body : JSON.stringify(body)
  res.statusCode = status
  res.setHeader('content-type', typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json')
  res.end(payload)
}

async function readBody(req: IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error('That photo is too large.')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const body = await readBody(req, 1_000_000)
  if (body.length === 0) return {}
  return JSON.parse(body.toString('utf8')) as Record<string, unknown>
}

function task(board: Board, id: string) {
  return board.tasks.find((item) => item.id === id)
}

function findProject(board: Board, key: string) {
  const needle = decodeURIComponent(key).trim().toLowerCase()
  if (!needle) return undefined
  return (
    board.projects.find((item) => item.path.toLowerCase() === needle) ??
    board.projects.find((item) => item.id.toLowerCase() === needle) ??
    board.projects.find((item) => item.name.toLowerCase() === needle)
  )
}

function compactTask(item: Board['tasks'][number]) {
  return {
    id: item.id,
    title: item.title,
    note: item.note,
    lane: item.lane,
    status: item.status,
    assist: item.assist,
    startedAt: item.startedAt,
    doneAt: item.doneAt,
    startRef: item.startRef,
    doneRef: item.doneRef,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function touch(item: Board['tasks'][number]): void {
  item.updatedAt = nowIso()
}

function newTaskFields(at: string) {
  return {
    status: 'open' as const,
    startedAt: null,
    doneAt: null,
    startRef: null,
    doneRef: null,
    createdAt: at,
    updatedAt: at,
  }
}

const laneWeight: Record<Lane, number> = { now: 0, next: 1, later: 2 }

function nextOrder(board: Board, projectId: string, lane: Lane, front: boolean): number {
  const orders = board.tasks
    .filter((item) => item.projectId === projectId && item.lane === lane && item.status !== 'done')
    .map((item) => item.order)
  if (orders.length === 0) return 0
  return front ? Math.min(...orders) - 1 : Math.max(...orders) + 1
}

export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return false
  const method = req.method ?? 'GET'
  const parts = url.pathname.split('/').filter(Boolean)

  try {
    if (method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, { ok: true, auth: authEnabled() })
      return true
    }
    if (method === 'POST' && url.pathname === '/api/login') {
      const loginBody = await readJson(req)
      const token = String(loginBody.password ?? '')
      if (authEnabled() && token !== (process.env.RHINO_PASSWORD ?? '').trim()) {
        send(res, 401, 'Wrong password')
        return true
      }
      if (authEnabled()) setAuthCookie(res)
      send(res, 200, { ok: true })
      return true
    }
    if (method === 'POST' && url.pathname === '/api/logout') {
      clearAuthCookie(res)
      send(res, 200, { ok: true })
      return true
    }
    const publicApi = url.pathname === '/api/health' || url.pathname === '/api/login' || url.pathname === '/api/logout'
    if (!publicApi && !isAuthorized(req)) {
      send(res, 401, 'Sign in required')
      return true
    }
    if (method === 'GET' && url.pathname === '/api/board') {
      send(res, 200, await readyBoard())
      return true
    }
    if (method === 'POST' && url.pathname === '/api/sync') {
      send(res, 200, await readyBoard())
      return true
    }
    if (method === 'POST' && url.pathname === '/api/capture') {
      send(res, 400, 'OCR runs in the browser now. Apply lines with /api/capture/apply.')
      return true
    }

    const body = method === 'GET' ? {} : await readJson(req)

    if (method === 'PUT' && url.pathname === '/api/board') {
      const incoming = body as Partial<Board> & { projects?: Board['projects']; tasks?: Board['tasks'] }
      if (!Array.isArray(incoming.projects) || !Array.isArray(incoming.tasks)) {
        throw new Error('Board replace needs projects and tasks arrays.')
      }
      send(
        res,
        200,
        await updateBoard((board) => {
          board.projects.splice(0, board.projects.length, ...incoming.projects!)
          board.tasks.splice(0, board.tasks.length, ...incoming.tasks!)
          board.goals.splice(0, board.goals.length, ...(Array.isArray(incoming.goals) ? incoming.goals : []))
          if (incoming.prefs) board.prefs = structuredClone(incoming.prefs)
          board.syncedAt = incoming.syncedAt ?? null
          board.lastSync = incoming.lastSync ?? null
        }),
      )
      return true
    }

    if (method === 'POST' && url.pathname === '/api/reset') {
      send(
        res,
        200,
        await updateBoard(async (board) => {
          const seed = createSeed()
          board.projects.splice(0, board.projects.length, ...seed.projects)
          board.tasks.splice(0, board.tasks.length, ...seed.tasks)
          board.goals.splice(0, board.goals.length, ...seed.goals)
          board.prefs = structuredClone(seed.prefs)
          board.syncedAt = null
          board.lastSync = null
        }),
      )
      return true
    }

    if (method === 'POST' && url.pathname === '/api/capture/apply') {
      send(
        res,
        200,
        await updateBoard((board) => {
          const project = board.projects.find((item) => item.id === String(body.projectId ?? ''))
          if (!project) throw new Error('Unknown project')
          const lines = Array.isArray(body.lines)
            ? body.lines.map((line) => String(line).trim()).filter((line) => line.length > 1)
            : []
          if (lines.length === 0) throw new Error('Nothing to add.')
          if (body.mode === 'notes') {
            const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const block = `${stamp}\n${lines.join('\n')}`
            const existing = project.notes?.trim() ?? ''
            project.notes = existing ? `${existing}\n\n${block}` : block
            return
          }
          const lane = (body.lane === 'next' || body.lane === 'later' ? body.lane : 'now') as Lane
          let order = nextOrder(board, project.id, lane, true)
          for (const title of lines) {
            const at = nowIso()
            board.tasks.push({
              id: crypto.randomUUID(),
              projectId: project.id,
              title,
              note: '',
              source: 'From a photo',
              lane,
              order,
              ...newTaskFields(at),
              origin: 'user',
              originKey: null,
              sourceChecked: false,
              assist: guessAssist(title),
            })
            order += 1
          }
        }),
      )
      return true
    }

    if (method === 'POST' && url.pathname === '/api/tasks') {
      send(
        res,
        200,
        await updateBoard((board) => {
          const projectId = String(body.projectId ?? '')
          const lane = (body.lane === 'next' || body.lane === 'later' ? body.lane : 'now') as Lane
          const title = String(body.title ?? '').trim() || 'Untitled'
          const note = typeof body.note === 'string' ? body.note.trim() : ''
          if (!board.projects.some((project) => project.id === projectId)) throw new Error('Unknown project')
          const at = nowIso()
          board.tasks.push({
            id: crypto.randomUUID(),
            projectId,
            title,
            note,
            source: 'Added here',
            lane,
            order: nextOrder(board, projectId, lane, true),
            ...newTaskFields(at),
            origin: 'user',
            originKey: null,
            sourceChecked: false,
            assist: guessAssist(title, note),
          })
        }),
      )
      return true
    }

    if (parts[0] === 'api' && parts[1] === 'tasks' && parts[2]) {
      const id = parts[2]
      if (method === 'PATCH' && parts.length === 3) {
        send(
          res,
          200,
          await updateBoard((board) => {
            const item = task(board, id)
            if (!item) throw new Error('Unknown task')
            let touched = false
            if (typeof body.title === 'string') {
              item.title = body.title.trim() || 'Untitled'
              touched = true
            }
            if (typeof body.note === 'string') {
              item.note = body.note.trim()
              touched = true
            }
            if (body.lane === 'now' || body.lane === 'next' || body.lane === 'later') {
              if (item.lane !== body.lane) {
                item.lane = body.lane
                item.order = nextOrder(board, item.projectId, item.lane, false)
                touched = true
              }
            }
            const statusPatch = parseStatusPatch(body)
            if (statusPatch.status && statusPatch.status !== item.status) {
              applyStatus(item, statusPatch.status, statusPatch)
              touched = true
            } else {
              if (statusPatch.startRef !== undefined) {
                item.startRef = statusPatch.startRef
                touched = true
              }
              if (statusPatch.doneRef !== undefined) {
                item.doneRef = statusPatch.doneRef
                touched = true
              }
            }
            if (typeof body.assist === 'number' && Number.isFinite(body.assist)) {
              item.assist = Math.min(10, Math.max(1, Math.round(body.assist)))
              touched = true
            }
            if (touched) {
              touch(item)
              if (item.origin === 'seed') item.origin = 'user'
            }
          }),
        )
        return true
      }
      if (method === 'DELETE' && parts.length === 3) {
        send(
          res,
          200,
          await updateBoard((board) => {
            const index = board.tasks.findIndex((item) => item.id === id)
            if (index >= 0) board.tasks.splice(index, 1)
          }),
        )
        return true
      }
      if (method === 'POST' && parts[3] === 'place') {
        send(
          res,
          200,
          await updateBoard((board) => {
            const item = task(board, id)
            if (!item || item.status === 'done') return
            const lane = (body.lane === 'now' || body.lane === 'next' || body.lane === 'later' ? body.lane : item.lane) as Lane
            const beforeId = typeof body.beforeId === 'string' ? body.beforeId : null
            item.lane = lane
            const siblings = board.tasks
              .filter((candidate) => candidate.projectId === item.projectId && candidate.lane === lane && candidate.status !== 'done' && candidate.id !== item.id)
              .sort((a, b) => a.order - b.order)
            const index = beforeId ? siblings.findIndex((candidate) => candidate.id === beforeId) : siblings.length
            siblings.splice(index < 0 ? siblings.length : index, 0, item)
            siblings.forEach((candidate, order) => {
              candidate.order = order
            })
            touch(item)
            if (item.origin === 'seed') item.origin = 'user'
          }),
        )
        return true
      }
      if (method === 'POST' && parts[3] === 'nudge') {
        const direction = body.direction === 1 ? 1 : -1
        send(
          res,
          200,
          await updateBoard((board) => {
            const item = task(board, id)
            if (!item) return
            const siblings = board.tasks
              .filter((candidate) => candidate.projectId === item.projectId && candidate.lane === item.lane && candidate.status !== 'done')
              .sort((a, b) => a.order - b.order)
            const index = siblings.findIndex((candidate) => candidate.id === id)
            const neighbor = siblings[index + direction]
            if (!neighbor) return
            const order = item.order
            item.order = neighbor.order
            neighbor.order = order
            touch(item)
            touch(neighbor)
          }),
        )
        return true
      }
    }

    if (method === 'POST' && url.pathname === '/api/projects') {
      send(
        res,
        200,
        await updateBoard((board) => {
          const name = String(body.name ?? '').trim() || 'Untitled project'
          const ranks = board.projects.filter((project) => project.status === 'open').map((project) => project.chargeRank)
          board.projects.push({
            id: crypto.randomUUID(),
            name,
            path: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project',
            summary: 'Added in Charging Rhino.',
            branch: null,
            lastTouched: new Date().toISOString().slice(0, 10),
            chargeRank: (ranks.length ? Math.max(...ranks) : -1) + 1,
            status: 'open',
            dirtyCount: null,
            todoFile: null,
          })
        }),
      )
      return true
    }

    if (method === 'POST' && url.pathname === '/api/projects/reorder') {
      send(
        res,
        200,
        await updateBoard((board) => {
          const draggedId = String(body.draggedId ?? '')
          const targetId = String(body.targetId ?? '')
          if (!draggedId || draggedId === targetId) return
          const open = board.projects.filter((project) => project.status === 'open').sort((a, b) => a.chargeRank - b.chargeRank)
          const from = open.findIndex((project) => project.id === draggedId)
          const to = open.findIndex((project) => project.id === targetId)
          if (from < 0 || to < 0) return
          const [item] = open.splice(from, 1)
          open.splice(to, 0, item)
          open.forEach((project, index) => {
            project.chargeRank = index
          })
        }),
      )
      return true
    }

    if (parts[0] === 'api' && parts[1] === 'projects' && parts[2]) {
      const key = parts[2]
      if (parts[3] === 'tasks' && parts.length === 4) {
        if (method === 'GET') {
          const board = await readyBoard()
          const project = findProject(board, key)
          if (!project) throw new Error('Unknown project')
          const openOnly = url.searchParams.get('open') === '1' || url.searchParams.get('open') === 'true'
          const tasks = board.tasks
            .filter((item) => item.projectId === project.id && (!openOnly || item.status !== 'done'))
            .sort((a, b) => laneWeight[a.lane] - laneWeight[b.lane] || a.order - b.order)
            .map(compactTask)
          send(res, 200, {
            project: { id: project.id, name: project.name, path: project.path },
            tasks,
          })
          return true
        }
        if (method === 'POST') {
          let created: ReturnType<typeof compactTask> | null = null
          await updateBoard((board) => {
            const project = findProject(board, key)
            if (!project) throw new Error('Unknown project')
            const lane = (body.lane === 'now' || body.lane === 'later' ? body.lane : 'next') as Lane
            const title = String(body.title ?? '').trim() || 'Untitled'
            const note = typeof body.note === 'string' ? body.note.trim() : ''
            const at = nowIso()
            const item = {
              id: crypto.randomUUID(),
              projectId: project.id,
              title,
              note,
              source: 'From project chat',
              lane,
              order: nextOrder(board, project.id, lane, true),
              ...newTaskFields(at),
              origin: 'user' as const,
              originKey: null,
              sourceChecked: false,
              assist: guessAssist(title, note),
            }
            board.tasks.push(item)
            created = compactTask(item)
          })
          send(res, 200, created)
          return true
        }
        if (method === 'DELETE') {
          let removed = 0
          await updateBoard((board) => {
            const project = findProject(board, key)
            if (!project) throw new Error('Unknown project')
            const before = board.tasks.length
            board.tasks = board.tasks.filter((item) => item.projectId !== project.id)
            removed = before - board.tasks.length
          })
          send(res, 200, { removed })
          return true
        }
      }
      if (method === 'PATCH' && parts.length === 3) {
        send(
          res,
          200,
          await updateBoard((board) => {
            const project = findProject(board, key) ?? board.projects.find((item) => item.id === key)
            if (!project) throw new Error('Unknown project')
            const status = body.status === 'shelved' || body.status === 'open' ? (body.status as ProjectStatus) : project.status
            const wasOpen = project.status === 'open'
            project.status = status
            if (status === 'open' && !wasOpen) {
              const ranks = board.projects.filter((item) => item.status === 'open' && item.id !== project.id).map((item) => item.chargeRank)
              project.chargeRank = (ranks.length ? Math.max(...ranks) : -1) + 1
            }
            if (typeof body.notes === 'string') project.notes = body.notes.trim()
            if (Array.isArray(body.tags)) {
              project.tags = cleanTags(body.tags)
              board.prefs.tags = cleanTags([...board.prefs.tags, ...project.tags])
            }
          }),
        )
        return true
      }
      if (method === 'POST' && parts[3] === 'nudge') {
        const direction = body.direction === 1 ? 1 : -1
        send(
          res,
          200,
          await updateBoard((board) => {
            const project = findProject(board, key)
            if (!project) return
            const open = board.projects.filter((item) => item.status === 'open').sort((a, b) => a.chargeRank - b.chargeRank)
            const from = open.findIndex((item) => item.id === project.id)
            const to = from + direction
            if (from < 0 || to < 0 || to >= open.length) return
            const [item] = open.splice(from, 1)
            open.splice(to, 0, item)
            open.forEach((entry, index) => {
              entry.chargeRank = index
            })
          }),
        )
        return true
      }
    }

    if (method === 'PATCH' && url.pathname === '/api/settings') {
      send(
        res,
        200,
        await updateBoard((board) => {
          if (body.defaultHorizon === 'day' || body.defaultHorizon === 'week' || body.defaultHorizon === 'month') {
            board.prefs.defaultHorizon = body.defaultHorizon as Horizon
          }
          if (typeof body.addTag === 'string') {
            const [tag] = cleanTags([body.addTag])
            if (!tag) throw new Error('Name the tag.')
            if (board.prefs.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) throw new Error('That tag is already on the list.')
            board.prefs.tags = cleanTags([...board.prefs.tags, tag])
          }
          if (body.renameTag && typeof body.renameTag === 'object') {
            const from = String((body.renameTag as { from?: string }).from ?? '').trim()
            const [to] = cleanTags([(body.renameTag as { to?: string }).to ?? ''])
            if (!from || !to) throw new Error('Rename needs both names.')
            const fromKey = from.toLowerCase()
            const index = board.prefs.tags.findIndex((item) => item.toLowerCase() === fromKey)
            if (index < 0) throw new Error('Unknown tag.')
            if (board.prefs.tags.some((item, i) => i !== index && item.toLowerCase() === to.toLowerCase())) {
              throw new Error('That tag is already on the list.')
            }
            board.prefs.tags[index] = to
            for (const project of board.projects) {
              project.tags = cleanTags((project.tags ?? []).map((item) => (item.toLowerCase() === fromKey ? to : item)))
            }
          }
          if (typeof body.removeTag === 'string') {
            const key = body.removeTag.trim().toLowerCase()
            board.prefs.tags = board.prefs.tags.filter((item) => item.toLowerCase() !== key)
            for (const project of board.projects) {
              project.tags = (project.tags ?? []).filter((item) => item.toLowerCase() !== key)
            }
          }
        }),
      )
      return true
    }

    if (method === 'POST' && url.pathname === '/api/goals') {
      send(
        res,
        200,
        await updateBoard((board) => {
          const name = String(body.name ?? '').trim()
          if (!name) throw new Error('Name the goal.')
          const goal: Goal = {
            id: crypto.randomUUID(),
            name,
            context: String(body.context ?? '').trim(),
            status: 'active',
            milestones: [],
          }
          board.goals.push(goal)
        }),
      )
      return true
    }

    if (parts[0] === 'api' && parts[1] === 'goals' && parts[2]) {
      const goalId = parts[2]
      if (method === 'DELETE' && parts.length === 3) {
        send(
          res,
          200,
          await updateBoard((board) => {
            board.goals = board.goals.filter((item) => item.id !== goalId)
          }),
        )
        return true
      }
      if (method === 'POST' && parts[3] === 'milestones' && parts.length === 4) {
        send(
          res,
          200,
          await updateBoard((board) => {
            const goal = board.goals.find((item) => item.id === goalId)
            if (!goal) throw new Error('Unknown goal')
            const title = String(body.title ?? '').trim()
            if (!title) throw new Error('Name the milestone.')
            goal.milestones.push({ id: crypto.randomUUID(), title, done: false })
            goal.status = 'active'
          }),
        )
        return true
      }
      if (method === 'PATCH' && parts[3] === 'milestones' && parts[4]) {
        send(
          res,
          200,
          await updateBoard((board) => {
            const goal = board.goals.find((item) => item.id === goalId)
            const milestone = goal?.milestones.find((item) => item.id === parts[4])
            if (!goal || !milestone) throw new Error('Unknown milestone')
            if (typeof body.done === 'boolean') milestone.done = body.done
            const finished = goal.milestones.length > 0 && goal.milestones.every((item) => item.done)
            goal.status = finished ? 'completed' : 'active'
          }),
        )
        return true
      }
    }

    send(res, 404, 'Not found')
  } catch (error) {
    send(res, 400, error instanceof Error ? error.message : 'Request failed')
  }
  return true
}
