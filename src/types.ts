export type Lane = 'now' | 'next' | 'later'
export type ProjectStatus = 'open' | 'shelved'
export type Horizon = 'day' | 'week' | 'month'
export type TaskStatus = 'open' | 'in_progress' | 'done'

export interface Prefs {
  defaultHorizon: Horizon
  tags: string[]
}

export interface Project {
  id: string
  name: string
  path: string
  summary: string
  branch: string | null
  lastTouched: string
  chargeRank: number
  status: ProjectStatus
  dirtyCount?: number | null
  todoFile?: string | null
  notes?: string
  tags?: string[]
}

export interface Task {
  id: string
  projectId: string
  title: string
  note: string
  source: string
  lane: Lane
  order: number
  status: TaskStatus
  startedAt: string | null
  doneAt: string | null
  startRef: string | null
  doneRef: string | null
  createdAt: string
  updatedAt: string
  origin: 'seed' | 'project' | 'user'
  originKey: string | null
  sourceChecked: boolean
  assist: number
}

export interface Milestone {
  id: string
  title: string
  done: boolean
}

export interface Goal {
  id: string
  name: string
  context: string
  status: 'active' | 'completed'
  milestones: Milestone[]
}

export interface SyncReport {
  at: string
  added: number
  closed: number
  refreshed: number
}

export interface Board {
  revision: number
  syncedAt: string | null
  lastSync: SyncReport | null
  projects: Project[]
  tasks: Task[]
  goals: Goal[]
  prefs: Prefs
}

export function isActiveTask(task: Pick<Task, 'status'>): boolean {
  return task.status !== 'done'
}

export function asTaskStatus(value: unknown): TaskStatus | null {
  if (value === 'open' || value === 'in_progress' || value === 'done') return value
  return null
}
