import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'read-list.swift')

function cleanLine(line: string): string {
  return line
    .replace(/^\s*(?:[-*•·–—=]+|\d+[.)]|[\[\(]\s*[xX✓✔ ]?\s*[\]\)]|[□☐☑✓✔●○•]|[Iil|]\s(?=[A-Z]))\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function readList(image: Buffer): Promise<string[]> {
  const dir = await mkdtemp(path.join(tmpdir(), 'rhino-list-'))
  const file = path.join(dir, 'list.jpg')
  try {
    await writeFile(file, image)
    const text = await recognize(file)
    const seen = new Set<string>()
    const lines: string[] = []
    for (const raw of text.split(/\r?\n/)) {
      const line = cleanLine(raw)
      const key = line.toLowerCase()
      if (line.length < 2 || seen.has(key)) continue
      seen.add(key)
      lines.push(line)
    }
    return lines
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

function recognize(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('swift', [script, file], { stdio: ['ignore', 'pipe', 'pipe'] })
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Reading the photo took too long.'))
    }, 60_000)
    let out = ''
    let err = ''
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      err += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) reject(new Error(err.trim() || 'Could not read that photo.'))
      else resolve(out)
    })
  })
}
