/** A rough 1–10 guess. 1 stays with a person, 10 looks ready to hand to an agent. */
export function guessAssist(title: string, note = ''): number {
  const text = `${title} ${note}`.toLowerCase()
  const human = ['review', 'decide', 'rewrite', 'brand', 'design', 'content', 'smoke', 'phone', 'walk', 'polish', 'owner', 'lyssna', 'confirm', 'clarity', 'judg']
  const agent = ['log', 'cache', 'extract', 'typescript', 'cron', 'script', 'export', 'test', 'probe', 'split', 'rename', 'format', 'version', 'vercel', 'monitor', 'type']
  let score = 5
  if (human.some((word) => text.includes(word))) score -= 3
  if (agent.some((word) => text.includes(word))) score += 3
  return Math.min(10, Math.max(1, score))
}
