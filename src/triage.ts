import type { Task } from './types'

/** Hands-on estimate at or under this many minutes counts as a quick win. */
export const QUICK_MAX_MINUTES = 20
/** Agent readiness at or above this score counts as handing to an agent. */
export const AGENT_MIN_SCORE = 7

export type TriageFilter = 'all' | 'quick' | 'agent'

/**
 * A task is triaged once it has a time estimate. Until then `assist` is only
 * the keyword guess made at creation and should not be shown or filtered on.
 */
export function isTriaged(task: Task): boolean {
  return typeof task.minutes === 'number' && task.minutes > 0
}

export function isQuick(task: Task): boolean {
  return isTriaged(task) && (task.minutes as number) <= QUICK_MAX_MINUTES
}

export function isAgentReady(task: Task): boolean {
  return isTriaged(task) && task.assist >= AGENT_MIN_SCORE
}

export function matchesTriage(task: Task, filter: TriageFilter): boolean {
  if (filter === 'quick') return isQuick(task)
  if (filter === 'agent') return isAgentReady(task)
  return true
}

export function triageCounts(tasks: Task[]): { all: number; quick: number; agent: number } {
  return {
    all: tasks.length,
    quick: tasks.filter(isQuick).length,
    agent: tasks.filter(isAgentReady).length,
  }
}
