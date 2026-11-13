import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const anyIcon = await readFile(path.join(publicDir, 'favicon.svg'))
const maskable = await readFile(path.join(publicDir, 'icon-maskable.svg'))

async function png(source, size, file) {
  const info = await sharp(source).resize(size, size).png().toFile(path.join(publicDir, file))
  console.log(file, info.size)
}

await png(anyIcon, 192, 'pwa-192.png')
await png(anyIcon, 512, 'pwa-512.png')
await png(anyIcon, 180, 'apple-touch-icon.png')
await png(maskable, 512, 'pwa-maskable-512.png')
