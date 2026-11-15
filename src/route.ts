export type GoalTab = 'journey' | 'progress'

export type AppRoute =
  | { name: 'home' }
  | { name: 'tasks' }
  | { name: 'projects' }
  | { name: 'project'; projectKey: string }
  | { name: 'goals'; goalId?: string; goalTab?: GoalTab }
  | { name: 'calendar' }
  | { name: 'progress' }
  | { name: 'settings' }

function cleanSearch(search: string): URLSearchParams {
  const params = new URLSearchParams(search)
  params.delete('_rhino_reload')
  return params
}

export function parseLocation(pathname = location.pathname, search = location.search): AppRoute {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean)
  const params = cleanSearch(search)
  const tab = params.get('tab') === 'progress' ? 'progress' : params.get('tab') === 'journey' ? 'journey' : undefined

  if (parts.length === 0) return { name: 'home' }

  const [head, key] = parts
  if (head === 'projects') {
    if (key) return { name: 'project', projectKey: decodeURIComponent(key) }
    return { name: 'projects' }
  }
  if (head === 'tasks') {
    if (key) return { name: 'project', projectKey: decodeURIComponent(key) }
    return { name: 'tasks' }
  }
  if (head === 'goals') {
    if (key) return { name: 'goals', goalId: decodeURIComponent(key), goalTab: tab }
    return { name: 'goals', goalTab: tab }
  }
  if (head === 'calendar') return { name: 'calendar' }
  if (head === 'progress') return { name: 'progress' }
  if (head === 'settings') return { name: 'settings' }
  if (head === 'home') return { name: 'home' }

  return { name: 'home' }
}

export function hrefFor(route: AppRoute): string {
  const params = cleanSearch(typeof location !== 'undefined' ? location.search : '')
  // Keep preview splash flag if present; drop routing noise.
  if (route.name === 'goals' && route.goalTab && route.goalTab !== 'journey') {
    params.set('tab', route.goalTab)
  } else {
    params.delete('tab')
  }

  let path = '/'
  if (route.name === 'tasks') path = '/tasks'
  else if (route.name === 'projects') path = '/projects'
  else if (route.name === 'project') path = `/projects/${encodeURIComponent(route.projectKey)}`
  else if (route.name === 'goals') {
    path = route.goalId ? `/goals/${encodeURIComponent(route.goalId)}` : '/goals'
  } else if (route.name === 'calendar') path = '/calendar'
  else if (route.name === 'progress') path = '/progress'
  else if (route.name === 'settings') path = '/settings'

  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function navigate(route: AppRoute, mode: 'push' | 'replace' = 'push'): void {
  if (typeof history === 'undefined') return
  const href = hrefFor(route)
  const current = `${location.pathname}${location.search}`
  if (current === href) return
  if (mode === 'replace') history.replaceState(history.state, '', href)
  else history.pushState(history.state, '', href)
}
