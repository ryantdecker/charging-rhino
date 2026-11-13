# Project contract & agent API

Charging Rhino owns the todo list. Project folders do **not** store Rhino todos. There is no folder sync — create projects and tasks in the UI or via this API.

## Optional metadata file

Projects may keep a root `charging-rhino.json` for humans (name, summary, tags). Rhino does not read it automatically.

## Agent API

**Local:** [http://127.0.0.1:4747](http://127.0.0.1:4747)  
**Hosted:** your Vercel URL (same paths)

If `RHINO_PASSWORD` is set, send `Authorization: Bearer <password>` (or Basic with any username).

Resolve a project by path key (`disc-golf-guru`), id (`dgg`), or exact name.

### List open tasks

```bash
curl -s 'http://127.0.0.1:4747/api/projects/disc-golf-guru/tasks?open=1' \
  -H "Authorization: Bearer $RHINO_PASSWORD"
```

Returns `{ project, tasks }` where each task includes `id`, `title`, `note`, `lane`, `status`, `assist`, `startedAt`, `doneAt`, `startRef`, `doneRef`, timestamps.

### Add a task

```bash
curl -s -X POST 'http://127.0.0.1:4747/api/projects/disc-golf-guru/tasks' \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $RHINO_PASSWORD" \
  -d '{"title":"Smoke live scorecard on mobile","note":"Safari + Chrome","lane":"next"}'
```

`lane` is `now` | `next` | `later` (default `next`).

### Update status / refs

Workflow: `open` → `in_progress` → `done`. Optional `startRef` / `doneRef` (commit SHA or URL).

Only mark `done` when the user explicitly approves.

```bash
curl -s -X PATCH "http://127.0.0.1:4747/api/tasks/<task-id>" \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $RHINO_PASSWORD" \
  -d '{"status":"in_progress","startRef":"https://github.com/org/repo/commit/abc"}'
```

```bash
curl -s -X PATCH "http://127.0.0.1:4747/api/tasks/<task-id>" \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $RHINO_PASSWORD" \
  -d '{"status":"done","doneRef":"abc123"}'
```

Also accepts `title`, `note`, `lane`, and `assist` (1–10). Legacy `{"done":true}` still maps to `status: "done"`.

### Clear all tasks for a project

```bash
curl -s -X DELETE 'http://127.0.0.1:4747/api/projects/dg-tour-app/tasks' \
  -H "Authorization: Bearer $RHINO_PASSWORD"
```

## Cursor rule

Copy [`examples/charging-rhino.mdc`](../examples/charging-rhino.mdc) to `.cursor/rules/charging-rhino.mdc` and set the project key. Point the base URL at localhost or the hosted app.
