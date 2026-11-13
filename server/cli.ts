import { readBoard } from './document.ts'

const board = await readBoard()

console.log(
  JSON.stringify(
    {
      store: process.env.RHINO_STORE ?? 'file',
      revision: board.revision,
      projects: board.projects.map((project) => ({
        id: project.id,
        name: project.name,
        path: project.path,
        status: project.status,
        open: board.tasks.filter((task) => task.projectId === project.id && task.status !== 'done').length,
      })),
      tasks: board.tasks.length,
      byStatus: {
        open: board.tasks.filter((task) => task.status === 'open').length,
        in_progress: board.tasks.filter((task) => task.status === 'in_progress').length,
        done: board.tasks.filter((task) => task.status === 'done').length,
      },
    },
    null,
    2,
  ),
)
