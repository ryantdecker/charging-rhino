# Charging Rhino

Personal project + todo dashboard. You and agents manage projects and tasks via the UI or HTTP API. No folder sync.

## Run locally

```bash
npm install
npm run dev
```

Opens at [http://localhost:4747](http://localhost:4747). Board data lives in `data/board.json` (`RHINO_STORE=file`).

## Host on Vercel

1. Create an Upstash Redis database and copy the REST URL + token.
2. Deploy this repo to Vercel.
3. Set env vars: `RHINO_STORE=redis`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RHINO_PASSWORD`.
4. Open the deployment URL and sign in with that password.

Agents use the same API with `Authorization: Bearer <password>`.

## Task workflow

`open` → `in_progress` → `done`, with optional `startRef` / `doneRef` (commit or URL).

## Agent API

See [docs/project-contract.md](docs/project-contract.md) and [examples/charging-rhino.mdc](examples/charging-rhino.mdc).
