import type { Board, Lane, Project, Task } from './types'
import { guessAssist } from './assist'

const defaultPrefs = {
  defaultHorizon: 'month' as const,
  tags: ['disc golf', 'client', 'personal'],
}

const seededOn = '2026-11-12'

function task(
  projectId: string,
  n: number,
  lane: Lane,
  order: number,
  title: string,
  note: string,
  source: string,
): Task {
  const at = `${seededOn}T12:00:00.000Z`
  return {
    id: `${projectId}-${n}`,
    projectId,
    title,
    note,
    source,
    lane,
    order,
    status: 'open',
    startedAt: null,
    doneAt: null,
    startRef: null,
    doneRef: null,
    createdAt: at,
    updatedAt: at,
    origin: 'seed',
    originKey: null,
    sourceChecked: false,
    assist: guessAssist(title, note),
  }
}

const projects: Project[] = [
  {
    id: 'dgg',
    name: 'Disc Golf Guru',
    path: 'disc-golf-guru',
    summary: 'Player profiles, live scoring, and compare on discgolf.guru.',
    branch: 'main',
    lastTouched: '2026-11-11',
    chargeRank: 0,
    status: 'open',
  },
  {
    id: 'service-flow',
    name: 'Actionably',
    path: 'service-flow-hub',
    summary: 'Guest and admin companions for live services. River Valley is the demo org.',
    branch: 'main',
    lastTouched: '2026-11-09',
    chargeRank: 1,
    status: 'open',
  },
  {
    id: 'dg-tour',
    name: 'DG Tour App',
    path: 'dg-tour-app',
    summary: 'Multi-tour season site. A wide season-UI pass is still uncommitted.',
    branch: 'feature/future-ui-updates',
    lastTouched: '2026-11-06',
    chargeRank: 2,
    status: 'open',
  },
  {
    id: 'asia-tour',
    name: 'PDGA Asia Tour',
    path: 'pdga-asia-tour',
    summary: 'Asia Tour site, mid-collapse from multi-tour routes to a single tour.',
    branch: 'feature/single-tour-asia',
    lastTouched: '2026-11-06',
    chargeRank: 3,
    status: 'open',
  },
  {
    id: 'pdga-api',
    name: 'PDGA API Reference',
    path: 'pdga-api-reference',
    summary: 'Local browser for Disc Golf Guru’s PDGA endpoint catalog and samples.',
    branch: null,
    lastTouched: '2026-10-30',
    chargeRank: 4,
    status: 'open',
  },
  {
    id: 'jbq',
    name: 'JBQ Guru',
    path: 'jbq-app',
    summary: 'Junior Bible Quiz practice. Last landed work was iOS chrome and a responsive pass.',
    branch: 'main',
    lastTouched: '2026-10-25',
    chargeRank: 5,
    status: 'open',
  },
  {
    id: 'sahodar',
    name: 'Sahodar USA',
    path: 'sahodar-usa',
    summary: 'Sahodar USA site. Content edits and an owner guide are still uncommitted.',
    branch: 'main',
    lastTouched: '2026-09-25',
    chargeRank: 6,
    status: 'open',
  },
  {
    id: 'sgu',
    name: 'SGU',
    path: 'SGU',
    summary: 'Sitemap and nav explorer. Lyssna tree-test reports are in; the nav B tree is still dirty.',
    branch: 'main',
    lastTouched: '2026-09-08',
    chargeRank: 7,
    status: 'open',
  },
  {
    id: 'charging-rhino',
    name: 'Charging Rhino',
    path: 'charging-rhino',
    summary: 'Personal charge board for ~/cursor-ai — projects, lanes, and agent-ready todos.',
    branch: 'main',
    lastTouched: seededOn,
    chargeRank: 8,
    status: 'open',
  },
]

const tasks: Task[] = [
  task('dgg', 1, 'now', 0, 'Review player comparison UI', 'Walk compare and head-to-head. Tighten layout, flow, and clarity.', 'docs/TODO.md'),
  task('dgg', 2, 'next', 0, 'Rewrite site content', 'Home, about, how-to, and FAQs still describe an older product.', 'docs/TODO.md'),
  task('dgg', 3, 'next', 1, 'Unify loading indicators', 'Same loading language on profile, live, compare, and enrichment.', 'docs/TODO.md'),
  task('dgg', 4, 'next', 2, 'Keep throw-by-throw detail after reselect', 'Cache hole breakdowns and throw timelines for a score so re-adding a player does not refetch.', 'docs/TODO.md'),
  task('dgg', 5, 'next', 3, 'Polish throw-by-throw UI', 'Hole strip, player cards, and timeline on desktop and mobile.', 'docs/TODO.md'),
  task('dgg', 6, 'next', 4, 'Fix mobile browser chrome on live', 'Sticky panes should follow dvh and visualViewport so Safari’s URL bar does not clip them.', 'docs/TODO.md'),
  task('dgg', 7, 'next', 5, 'Make DNF handling consistent', 'Treat 888/999 the same way on live, profile, compare, scorecards, and stats.', 'docs/TODO.md'),
  task('dgg', 8, 'next', 6, 'Treat zero-opportunity stats as missing', 'Opportunity count 0 should not render as 0%. Finish nested donuts and PlayerDashboard.', 'docs/TODO.md'),
  task('dgg', 9, 'later', 0, 'Refresh shareables', 'Export cards and formats need to match the current design.', 'docs/TODO.md'),
  task('dgg', 10, 'later', 1, 'Branding and design-system pass', 'Brand, color, type, and surfaces.', 'docs/TODO.md'),
  task('dgg', 11, 'later', 2, 'Add PNG and JPEG share export', 'Format choice is still open on share export.', 'docs/TODO.md'),
  task('dgg', 12, 'later', 3, 'Tighten TypeScript and extract the rest of the player page', 'Strict mode, fewer any types, formatting utils, and the remaining composables.', 'docs/TODO.md'),
  task('dgg', 13, 'later', 4, 'Add tests, accessibility, and monitoring', 'Vitest, keyboard and contrast, and a privacy-friendly error trail.', 'docs/TODO.md'),
  task('dgg', 14, 'later', 5, 'Cut profile weight', 'Caching, chart cost, and route-level code splitting.', 'docs/TODO.md'),
  task(
    'dgg',
    15,
    'next',
    7,
    'Post-deploy: check Vercel logs for 429s',
    'After www-parallel is live, filter Vercel logs for [PDGA www], [PDGA official], [Rate Limit], 429, Retry-After, and requeue. Confirm backoff/retry looks healthy under real traffic.',
    'docs/TODO.md',
  ),

  task('service-flow', 1, 'now', 0, 'Finish the open flow-builder edit', 'app/pages/admin/o/[org]/v/[venue]/e/[event]/flow.vue is still modified on main.', 'Working tree'),
  task('service-flow', 2, 'next', 0, 'Give admin edits a durable store', 'On Vercel, JSON writes do not survive a cold start. Local npm run dev is the durable path.', 'README'),
  task('service-flow', 3, 'next', 1, 'Check guest and mobile flow on a phone', 'The 9 Nov pass tightened guest link layout and stopped muting inactive segments.', 'Recent commits'),
  task('service-flow', 4, 'later', 0, 'Confirm past flows stay read-only', 'That behavior landed on 9 Nov and is worth a pass on a completed service.', 'Recent commits'),

  task('dg-tour', 1, 'now', 0, 'Land the season UI port', 'feature/future-ui-updates has a wide uncommitted pass: neutral season accents, tour colors only for unsanctioned events and logos.', 'Working tree'),
  task('dg-tour', 2, 'next', 0, 'Quiet PDGA logging after 429s settle', 'Request and response logs are in place. Reduce them once rate limits are calm.', 'TODO.md'),
  task('dg-tour', 3, 'next', 1, 'Harden weekend automation', 'Verify hydrate-due-events and publish-due-events across one full weekend in production logs.', 'TODO.md'),
  task('dg-tour', 4, 'next', 2, 'Realign cron around DST', 'Keep Sat/Sun 9pm and 10pm CT correct in vercel.json across the DST change.', 'TODO.md'),
  task('dg-tour', 5, 'next', 3, 'Write the automation runbook', 'Manual midweek fallback, expected endpoint responses, and troubleshooting.', 'TODO.md'),
  task('dg-tour', 6, 'next', 4, 'Surface notification send status', 'Hydrate and publish JSON should say attempted, sent, or failed.', 'TODO.md'),
  task('dg-tour', 7, 'next', 5, 'Test an event moving from future to completed', 'Recap, events tab, standings preload, and automation publish timing.', 'TODO.md'),

  task('asia-tour', 1, 'now', 0, 'Finish the single-tour route collapse', 'Working tree renames [tour]/[year] pages onto [year] and is still uncommitted on feature/single-tour-asia.', 'Working tree'),
  task('asia-tour', 2, 'next', 0, 'Quiet PDGA logging after 429s settle', 'Request and response logs are in place. Reduce them once rate limits are calm.', 'TODO.md'),
  task('asia-tour', 3, 'next', 1, 'Harden weekend automation', 'Verify hydrate-due-events and publish-due-events across one full weekend in production logs.', 'TODO.md'),
  task('asia-tour', 4, 'next', 2, 'Realign cron around DST', 'Keep Sat/Sun 9pm and 10pm CT correct in vercel.json across the DST change.', 'TODO.md'),
  task('asia-tour', 5, 'next', 3, 'Write the automation runbook', 'Manual midweek fallback, expected endpoint responses, and troubleshooting.', 'TODO.md'),
  task('asia-tour', 6, 'next', 4, 'Surface notification send status', 'Hydrate and publish JSON should say attempted, sent, or failed.', 'TODO.md'),
  task('asia-tour', 7, 'next', 5, 'Test an event moving from future to completed', 'Recap, events tab, standings preload, and automation publish timing.', 'TODO.md'),

  task('pdga-api', 1, 'now', 0, 'Leave stats opportunity semantics on hold, visibly', 'Nested donuts and PlayerDashboard are the remaining compliance gap. The reference should keep pointing at that hold.', 'Compliance TODO'),
  task('pdga-api', 2, 'next', 0, 'Note the immortal live-tab maps', 'Soft follow-up: in-tab maps live for the session. Poll gates already limit refetch.', 'Compliance TODO'),
  task('pdga-api', 3, 'next', 1, 'Re-probe samples when PDGA contracts change', 'Run the Disc Golf Guru probe script, then npm run sync here.', 'README'),

  task('jbq', 1, 'now', 0, 'Account for the dirty version file', 'public/version.json is the only uncommitted change after the 25 Oct iOS chrome pass. The repo has no TODO file.', 'Working tree'),
  task('jbq', 2, 'next', 0, 'Smoke the installed iOS home-screen chrome', 'Purple status bar, and the extra inset work that was dropped should stay dropped.', 'Recent commits'),
  task('jbq', 3, 'next', 1, 'Smoke the responsive pass', 'Profile, games, and Buzzball.', 'Recent commits'),

  task('sahodar', 1, 'now', 0, 'Finish the site content edit', 'sahodar-usa-site/src/content/siteContent.ts is modified.', 'Working tree'),
  task('sahodar', 2, 'next', 0, 'Decide whether to keep the owner guide', 'SITE_OWNER_GUIDE.md and docs/ are untracked.', 'Working tree'),

  task('sgu', 1, 'now', 0, 'Reconcile the nav B tree', 'viz/public/data/nav-b-tree.json and viz/.nav-b-figma-payload.json are still uncommitted.', 'Working tree'),
  task('sgu', 2, 'next', 0, 'Review the Lyssna tree-test reports', 'Current, proposed, and comparison views landed on 8 Sep.', 'Recent commits'),
  task('sgu', 3, 'later', 0, 'Sort viz/tmp and viz/docs', 'Untracked scratch sitting next to the nav work.', 'Working tree'),

  task('charging-rhino', 1, 'now', 0, 'Polish photo capture OCR', 'Parked: tighten From a photo read accuracy and apply UX.', 'Product'),
  task(
    'charging-rhino',
    2,
    'next',
    0,
    'Wire remaining projects to the Rhino API rule',
    'Copy the always-on Cursor rule into Asia Tour, PDGA API, JBQ, Actionably, and the rest.',
    'Agent API',
  ),
  task(
    'charging-rhino',
    3,
    'next',
    1,
    'First durable backup of the board',
    'Commit or otherwise snapshot data/board.json so the charge is not only local ephemeral state.',
    'Ops',
  ),
  task('charging-rhino', 4, 'later', 0, 'PWA install shell', 'Make the charge installable on phone and desktop.', 'Product'),
  task('charging-rhino', 5, 'later', 1, 'Expand Goals beyond the stub', 'Only when you ask — milestones that actually steer the horn.', 'Product'),
  task('charging-rhino', 6, 'later', 2, 'Calendar depth', 'Tie due dates and done history into a useful week view.', 'Product'),
]

export const seedNote = `Open projects touched since September 2026, with todos taken from each repo on ${seededOn}.`

export function createSeed(): Board {
  return {
    revision: 1,
    syncedAt: null,
    lastSync: null,
    projects: structuredClone(projects),
    tasks: structuredClone(tasks),
    goals: [],
    prefs: structuredClone(defaultPrefs),
  }
}
