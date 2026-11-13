import * as esbuild from 'esbuild'
import { mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// .cjs forces CommonJS even when package.json has "type": "module"
const outfile = path.join(root, 'api', '[...path].cjs')

await mkdir(path.dirname(outfile), { recursive: true })
for (const stale of ['[...path].js', '[...path].ts']) {
  await unlink(path.join(root, 'api', stale)).catch(() => undefined)
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
