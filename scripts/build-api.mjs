import * as esbuild from 'esbuild'
import { mkdir, unlink, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiDir = path.join(root, 'api')
const outfile = path.join(apiDir, 'index.cjs')

await mkdir(apiDir, { recursive: true })

// Drop old experiment handlers so Vercel only sees index.cjs
for (const name of await readdir(apiDir).catch(() => [])) {
  if (name === 'index.cjs') continue
  if (/\.(cjs|js|ts|mjs)$/.test(name)) {
    await unlink(path.join(apiDir, name)).catch(() => undefined)
  }
}

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(root, 'server', 'vercel-entry.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile,
  logLevel: 'info',
  external: [],
  footer: {
    js: '\nmodule.exports = module.exports.default || module.exports;\n',
  },
})

console.log('wrote', path.relative(root, outfile))
