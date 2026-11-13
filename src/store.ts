import { reactive, ref } from 'vue'
import type { Board, Goal, Horizon, Lane, Project, Task, TaskStatus } from './types'
import { isActiveTask } from './types'

const laneWeight: Record<Lane, number> = { now: 0, next: 1, later: 2 }

export const board = reactive<Board>({
  revision: 0,
  syncedAt: null,
  lastSync: null,
  projects: [],
  tasks: [],
  goals: [],
  prefs: { defaultHorizon: 'month', tags: [] },
})

export const ready = ref(false)
export const syncing = ref(false)
export const loadError = ref('')
export const authRequired = ref(false)
export const authed = ref(false)

let seenRevision = 0
let authPassword = ''

export function setAuthPassword(password: string): void {
  authPassword = password.trim()
  if (authPassword) sessionStorage.setItem('rhino_auth', authPassword)
  else sessionStorage.removeItem('rhino_auth')
}

function loadStoredPassword(): void {
  if (authPassword) return
  authPassword = sessionStorage.getItem('rhino_auth') ?? ''
}

function apply(next: Board) {
  if (next.revision < seenRevision) return
  seenRevision = next.revision
  board.revision = next.revision
  board.syncedAt = next.syncedAt
  board.lastSync = next.lastSync
  board.projects.splice(0, board.projects.length, ...next.projects)
  board.tasks.splice(0, board.tasks.length, ...next.tasks)
  board.goals.splice(0, board.goals.length, ...(next.goals ?? []))
  board.prefs.defaultHorizon = next.prefs?.defaultHorizon ?? 'month'
  board.prefs.tags.splice(0, board.prefs.tags.length, ...(next.prefs?.tags ?? []))
}

async function request(url: string, init?: { method?: string; body?: unknown }): Promise<Board> {
  loadStoredPassword()
  const headers: Record<string, string> = {}
  if (init?.body) headers['content-type'] = 'application/json'
  if (authPassword) headers.authorization = `Bearer ${authPassword}`
  const response = await fetch(url, {
    method: init?.method ?? 'GET',
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    credentials: 'include',
  })
  if (response.status === 401) {
    authRequired.value = true
    authed.value = false
    throw new Error('Sign in required')
  }
  const text = await response.text()
  if (!response.ok) throw new Error(text.slice(0, 200) || `HTTP ${response.status}`)
  try {
    return JSON.parse(text) as Board
  } catch {
    throw new Error(text.slice(0, 200) || 'Invalid JSON from API')
  }
}

async function commit(url: string, init?: { method?: string; body?: unknown }): Promise<Board> {
  try {
    const next = await request(url, init)
    apply(next)
    loadError.value = ''
    return next
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'The board could not be saved.'
    const fresh = await request('/api/board').catch(() => null)
    if (fresh) apply(fresh)
    throw error
  }
}

async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(text.slice(0, 200) || `HTTP ${response.status}`)
  }
}

export async function hydrate(): Promise<void> {
  try {
    const healthRes = await fetch('/api/health')
    const health = await readJsonSafe<{ auth?: boolean; error?: string }>(healthRes)
    if (!healthRes.ok) throw new Error(health?.error || `Health check failed (${healthRes.status})`)
    authRequired.value = Boolean(health?.auth)
    apply(await request('/api/board'))
    ready.value = true
    authed.value = true
    loadError.value = ''
  } catch (error) {
    ready.value = !authRequired.value
    loadError.value = error instanceof Error ? error.message : 'The board could not be loaded.'
  }
}

export async function login(password: string): Promise<void> {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  })
  if (!response.ok) throw new Error((await response.text()) || 'Wrong password')
  setAuthPassword(password)
  authRequired.value = false
  authed.value = true
  await hydrate()
}

export async function logout(): Promise<void> {
  setAuthPassword('')
  await fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined)
  authed.value = false
  authRequired.value = true
  ready.value = false
}

export function projectById(id: string): Project | undefined {
  return board.projects.find((project) => project.id === id)
}

export function openProjects(): Project[] {
  return board.projects.filter((project) => project.status === 'open').sort((a, b) => a.chargeRank - b.chargeRank)
}

export function shelvedProjects(): Project[] {
  return board.projects.filter((project) => project.status === 'shelved').sort((a, b) => a.name.localeCompare(b.name))
}

export function tasksFor(projectId: string, lane?: Lane, done = false): Task[] {
  return board.tasks
    .filter((task) => {
      const matchesDone = done ? task.status === 'done' : isActiveTask(task)
      return task.projectId === projectId && matchesDone && (lane ? task.lane === lane : true)
    })
    .sort((a, b) => {
      if (done) return (b.doneAt ?? '').localeCompare(a.doneAt ?? '')
      const statusRank = (status: TaskStatus) => (status === 'in_progress' ? 0 : 1)
      return statusRank(a.status) - statusRank(b.status) || laneWeight[a.lane] - laneWeight[b.lane] || a.order - b.order
    })
}

export function topTask(projectId: string): Task | undefined {
  return tasksFor(projectId).at(0)
}

export function openCount(projectId: string): number {
  return board.tasks.filter((task) => task.projectId === projectId && isActiveTask(task)).length
}

export async function addTask(projectId: string, title: string, lane: Lane, note = ''): Promise<string | null> {
  const before = new Set(board.tasks.map((task) => task.id))
  await commit('/api/tasks', { method: 'POST', body: { projectId, title, lane, note } })
  const created = board.tasks.find((task) => task.projectId === projectId && !before.has(task.id))
  return created?.id ?? null
}

function touchLocal(task: { updatedAt: string }): void {
  task.updatedAt = new Date().toISOString()
}

export function renameTask(id: string, title: string): void {
  const task = board.tasks.find((item) => item.id === id)
  if (task) {
    task.title = title.trim() || 'Untitled'
    touchLocal(task)
  }
  void commit(`/api/tasks/${id}`, { method: 'PATCH', body: { title } })
}

export function setNote(id: string, note: string): void {
  const task = board.tasks.find((item) => item.id === id)
  if (task) {
    task.note = note.trim()
    touchLocal(task)
  }
  void commit(`/api/tasks/${id}`, { method: 'PATCH', body: { note } })
}

export function setTaskStatus(
  id: string,
  status: TaskStatus,
  refs?: { startRef?: string | null; doneRef?: string | null },
): void {
  const task = board.tasks.find((item) => item.id === id)
  if (!task) return
  const at = new Date().toISOString()
  task.status = status
  if (status === 'in_progress') {
    task.startedAt = task.startedAt ?? at
    if (refs?.startRef !== undefined) task.startRef = refs.startRef?.trim() || null
  }
  if (status === 'done') {
    task.doneAt = at
    if (refs?.doneRef !== undefined) task.doneRef = refs.doneRef?.trim() || null
  }
  if (status === 'open') task.doneAt = null
  touchLocal(task)
  void commit(`/api/tasks/${id}`, { method: 'PATCH', body: { status, ...refs } })
}

export function toggleTask(id: string): void {
  const task = board.tasks.find((item) => item.id === id)
  if (!task) return
  setTaskStatus(id, task.status === 'done' ? 'open' : 'done')
}

export function setTaskRef(id: string, field: 'startRef' | 'doneRef', value: string): void {
  const task = board.tasks.find((item) => item.id === id)
  if (!task) return
  task[field] = value.trim() || null
  touchLocal(task)
  void commit(`/api/tasks/${id}`, { method: 'PATCH', body: { [field]: task[field] } })
}

export function setLane(id: string, lane: Lane): void {
  const task = board.tasks.find((item) => item.id === id)
  if (!task || task.lane === lane) return
  task.lane = lane
  touchLocal(task)
  void commit(`/api/tasks/${id}`, { method: 'PATCH', body: { lane } })
}

export function setAssist(id: string, assist: number): void {
  const task = board.tasks.find((item) => item.id === id)
  const score = Math.min(10, Math.max(1, Math.round(assist)))
  if (task) {
    task.assist = score
    touchLocal(task)
  }
  void commit(`/api/tasks/${id}`, { method: 'PATCH', body: { assist: score } })
}

export function placeTask(id: string, lane: Lane, beforeId: string | null): void {
  const item = board.tasks.find((task) => task.id === id)
  if (!item || item.status === 'done' || beforeId === id) return
  item.lane = lane
  const siblings = board.tasks
    .filter((task) => task.projectId === item.projectId && task.lane === lane && isActiveTask(task) && task.id !== id)
    .sort((a, b) => a.order - b.order)
  const index = beforeId ? siblings.findIndex((task) => task.id === beforeId) : siblings.length
  siblings.splice(index < 0 ? siblings.length : index, 0, item)
  siblings.forEach((task, order) => {
    task.order = order
  })
  touchLocal(item)
  void commit(`/api/tasks/${id}/place`, { method: 'POST', body: { lane, beforeId } })
}

export function moveTask(id: string, direction: -1 | 1): void {
  void commit(`/api/tasks/${id}/nudge`, { method: 'POST', body: { direction } })
}

export function removeTask(id: string): void {
  const index = board.tasks.findIndex((task) => task.id === id)
  if (index >= 0) board.tasks.splice(index, 1)
  void commit(`/api/tasks/${id}`, { method: 'DELETE' })
}

export function moveProject(id: string, direction: -1 | 1): void {
  void commit(`/api/projects/${id}/nudge`, { method: 'POST', body: { direction } })
}

export function moveProjectTo(draggedId: string, targetId: string): void {
  void commit('/api/projects/reorder', { method: 'POST', body: { draggedId, targetId } })
}

export function setProjectStatus(id: string, status: Project['status']): void {
  void commit(`/api/projects/${id}`, { method: 'PATCH', body: { status } })
}

export function setProjectTags(id: string, tags: string[]): void {
  const project = board.projects.find((item) => item.id === id)
  if (project) project.tags = tags
  for (const tag of tags) {
    if (!board.prefs.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) board.prefs.tags.push(tag)
  }
  void commit(`/api/projects/${id}`, { method: 'PATCH', body: { tags } })
}

export function saveSettings(body: {
  defaultHorizon?: Horizon
  addTag?: string
  renameTag?: { from: string; to: string }
  removeTag?: string
}): void {
  if (body.defaultHorizon) board.prefs.defaultHorizon = body.defaultHorizon
  if (body.addTag) {
    const tag = body.addTag.trim().replace(/\s+/g, ' ')
    if (tag && !board.prefs.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) board.prefs.tags.push(tag)
  }
  if (body.renameTag) {
    const fromKey = body.renameTag.from.toLowerCase()
    const to = body.renameTag.to.trim().replace(/\s+/g, ' ')
    const index = board.prefs.tags.findIndex((item) => item.toLowerCase() === fromKey)
    if (index >= 0 && to) board.prefs.tags[index] = to
    for (const project of board.projects) {
      project.tags = (project.tags ?? []).map((item) => (item.toLowerCase() === fromKey ? to : item))
    }
  }
  if (body.removeTag) {
    const key = body.removeTag.toLowerCase()
    board.prefs.tags = board.prefs.tags.filter((item) => item.toLowerCase() !== key)
    for (const project of board.projects) {
      project.tags = (project.tags ?? []).filter((item) => item.toLowerCase() !== key)
    }
  }
  void commit('/api/settings', { method: 'PATCH', body })
}

export function saveNotes(id: string, notes: string): void {
  const project = board.projects.find((item) => item.id === id)
  if (project) project.notes = notes
  void commit(`/api/projects/${id}`, { method: 'PATCH', body: { notes } })
}

export async function readPhoto(image: string): Promise<string[]> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')
  try {
    const { data } = await worker.recognize(image)
    return data.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 1)
  } finally {
    await worker.terminate()
  }
}

export async function applyCapture(input: {
  projectId: string
  mode: 'todos' | 'notes'
  lane: Lane
  lines: string[]
}): Promise<void> {
  await commit('/api/capture/apply', { method: 'POST', body: input })
}

export async function addProject(name: string): Promise<Project | undefined> {
  const clean = name.trim() || 'Untitled project'
  const next = await commit('/api/projects', { method: 'POST', body: { name: clean } })
  return [...next.projects].reverse().find((project) => project.name === clean)
}

export async function addGoal(name: string, context: string): Promise<Goal | undefined> {
  const clean = name.trim()
  if (!clean) return
  const next = await commit('/api/goals', { method: 'POST', body: { name: clean, context: context.trim() } })
  return [...next.goals].reverse().find((goal) => goal.name === clean)
}

export function addMilestone(goalId: string, title: string): void {
  const clean = title.trim()
  if (!clean) return
  void commit(`/api/goals/${goalId}/milestones`, { method: 'POST', body: { title: clean } })
}

export function removeGoal(goalId: string): void {
  const index = board.goals.findIndex((goal) => goal.id === goalId)
  if (index >= 0) board.goals.splice(index, 1)
  void commit(`/api/goals/${goalId}`, { method: 'DELETE' })
}

export function toggleMilestone(goalId: string, milestoneId: string): void {
  const goal = board.goals.find((item) => item.id === goalId)
  const milestone = goal?.milestones.find((item) => item.id === milestoneId)
  if (!goal || !milestone) return
  milestone.done = !milestone.done
  const finished = goal.milestones.length > 0 && goal.milestones.every((item) => item.done)
  goal.status = finished ? 'completed' : 'active'
  void commit(`/api/goals/${goalId}/milestones/${milestoneId}`, { method: 'PATCH', body: { done: milestone.done } })
}

export function resetBoard(): void {
  seenRevision = 0
  void commit('/api/reset', { method: 'POST' })
}

export function watchBoard(): void {
  window.setInterval(() => {
    const active = document.activeElement
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
    void request('/api/board')
      .then(apply)
      .catch(() => undefined)
  }, 30_000)
}
