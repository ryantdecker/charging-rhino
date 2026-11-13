#!/usr/bin/env node
/**
 * Push local data/board.json to a Rhino instance (default: production).
 *
 *   RHINO_PASSWORD='…' npm run push-board
 *   RHINO_PASSWORD='…' RHINO_URL=http://127.0.0.1:4747 npm run push-board
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const url = (process.env.RHINO_URL ?? 'https://charging-rhino.vercel.app').replace(/\/$/, '')
const password = process.env.RHINO_PASSWORD?.trim() ?? ''

if (!password) {
  console.error('Set RHINO_PASSWORD to your app password, then re-run.')
  process.exit(1)
}

const board = JSON.parse(await readFile(path.join(root, 'data', 'board.json'), 'utf8'))
const response = await fetch(`${url}/api/board`, {
  method: 'PUT',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${password}`,
  },
  body: JSON.stringify(board),
})

const text = await response.text()
if (!response.ok) {
  console.error(`Push failed (${response.status}):`, text.slice(0, 500))
  process.exit(1)
}

const next = JSON.parse(text)
console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      revision: next.revision,
      projects: next.projects?.length,
      tasks: next.tasks?.length,
      open: next.tasks?.filter((t) => t.status !== 'done').length,
    },
    null,
    2,
  ),
)
