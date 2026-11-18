---
name: triage-tasks
description: >-
  Sorts open Charging Rhino tasks into quick wins (20 minutes or less, clears
  noise) and agent-ready work (an agent runs it, the user initiates, reviews,
  and approves), stores the verdict on each task, and learns from corrections.
  Use when the user asks to triage, sort, or analyze the task list, find quick
  wins, or find what to hand to agents.
disable-model-invocation: true
---

# Triage tasks

Two buckets, one pass over every open task:

- **Quick**: 20 minutes or less of hands-on work. Clears noise.
- **Agent**: an agent can do it end to end; the user starts it, reviews the result, approves it.

Everything else is **Neither** (needs the person, or is too big or vague).

Verdicts live on the task in Rhino, so reruns stay consistent:

- `minutes`: hands-on time estimate. Quick means `minutes <= 20`.
- `assist`: 1–10 agent-readiness. Agent means `assist >= 7`.

A task can be both. Report it under Agent and mark it "also quick".

## Trust model for `assist`

Before this routine, `assist` was a keyword guess set when a task was created. It is not evidence.

- A task is **triaged** only when `minutes` is set. Until then, ignore its `assist` completely and never use it to anchor a score.
- Triage overwrites the guess. The first run re-scores everything open.
- `assist` earns trust through outcomes: every time the user hands an Agent-bucket task to an agent, record what happened (see Agent outcomes). Scores are only as reliable as that record, so say how much evidence exists when you report ("7 agent tasks scored, 2 outcomes recorded so far").

## Run

Copy and track:

```
- [ ] 1. Load rubric.md and calibration.md
- [ ] 2. Fetch open tasks
- [ ] 3. Classify
- [ ] 4. Write verdicts back
- [ ] 5. Report
- [ ] 6. Learn from corrections
```

**1. Load.** Read [rubric.md](rubric.md) and [calibration.md](calibration.md). Calibration overrides the rubric when they conflict.

**2. Fetch.** All projects in one call:

```bash
curl -s 'https://charging-rhino.vercel.app/api/board' -H "Authorization: Bearer $RHINO_PASSWORD"
```

Keep tasks where `status != "done"` and the project is `open`. By default triage only tasks with `minutes == null`. If the user says "re-triage all", do every open task.

**3. Classify.** Apply the rubric to title, note, project, and lane. Give every task a `minutes` estimate (including Neither tasks) and an `assist` score. Mark low confidence when the title is vague or the rubric signals conflict.

**4. Write back.** One PATCH per task whose values changed:

```bash
curl -s -X PATCH 'https://charging-rhino.vercel.app/api/tasks/TASK_ID' \
  -H 'content-type: application/json' \
  -H "Authorization: Bearer $RHINO_PASSWORD" \
  -d '{"minutes":15,"assist":8}'
```

Never change `status`, `lane`, `title`, or `note`. Never mark anything done.

**5. Report** in this shape, no tables:

```
Quick (N, ~X min total)
- Task title — Project — 10 min

Agent (N)
- Task title — Project — assist 8
  Brief: goal in one line. Done when: checkable result. Where: repo/path/URL.

Neither: N tasks left alone.

Unsure (review these):
- Task title — I said Quick/Agent/Neither because …
```

Lead with the quick list sorted shortest first. Keep briefs to the three fields; they are what the user pastes into an agent.

**6. Learn.** Ask the user to correct the Unsure items and anything that looks wrong. For each correction:

1. PATCH the task with the corrected `minutes` / `assist`.
2. Append an entry to [calibration.md](calibration.md) using its format.

Then check outcomes (see below) and record any bias.

## Outcome check (every run)

**Time.** Find done tasks that have `minutes` set and both `startedAt` and `doneAt`. Compare actual (`doneAt - startedAt`) to the estimate. Only trust gaps under a day; longer spans include idle time. If estimates are consistently off for a kind of task (for example, anything touching deploys runs 2x), add a rule to calibration.md.

**Agent outcomes.** This is what makes `assist` meaningful. Ask: "Did you hand any Agent-bucket tasks to an agent since last time?" For each one, log the score it had and the result:

- `clean`: approved with little or no changes.
- `rework`: needed real fixes or a second pass.
- `failed`: dropped or done by hand.

Then compare per score band. If 8–10 tasks show `rework` or `failed`, the rubric is too generous; find what they share and add a rule. If 4–6 tasks go `clean`, it is too strict. Include a one-line hit rate in the report once there are at least 5 outcomes.

## Keeping calibration useful

- Newest entries at the top of the log.
- When the log passes about 15 entries, distill repeated patterns into **Learned rules** at the top of calibration.md and delete the entries they replace.
- Rules are short and testable ("Email-a-person tasks: 10 min, Quick"), not narrative.
