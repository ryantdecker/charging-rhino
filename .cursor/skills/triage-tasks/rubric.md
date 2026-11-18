# Triage rubric

## Quick (`minutes <= 20`)

All of these hold:

- One clear action, no open questions.
- Needs no one else's reply or input first.
- Can start now with what the user already has.
- Done is obvious (sent, filed, paid, merged, booked).

Typical: a short email or message, a form, a booking, a small config or copy edit, a decision already made that just needs executing, tidying a note.

Not quick even if it sounds small: anything that waits on someone, needs research first, or touches deploys, billing, or accounts with surprises.

Estimate in these steps: 5, 10, 15, 20, then 30, 45, 60, 90, 120, 240. Round up when unsure.

## Agent (`assist >= 7`)

All of these hold:

- **Defined outcome.** The task states or implies what finished looks like.
- **Reachable context.** Everything needed is in a repo, an API, a doc, or a URL an agent can open.
- **Checkable result.** A diff, test run, build, screenshot, or written artifact the user can review in a few minutes.
- **Low blast radius.** Nothing irreversible happens without the user approving.
- **No human-only step.** No phone call, in-person errand, personal credential entry, or taste call that only the user can make.

Strong signals: refactors, tests, scripts, data cleanup, research summaries, first drafts, migrations with a dry run, dependency or config updates, writing docs from existing code.

Scoring `assist`:

- 9–10: scoped, verifiable, in a repo the agent can open. User reviews a diff.
- 7–8: agent does most of it; user supplies one input or makes one call.
- 4–6: agent could help but user would manage it closely.
- 1–3: needs the person (judgement, relationships, physical world, brand or design taste).

The score is about how little the user must manage, not how smart the task is.

Score from the task itself, never from its stored `assist`; the old value is an untested keyword guess.

## Neither

Needs the person's judgement, a conversation, a purchase, physical presence, or is too vague to brief. Still give it a `minutes` estimate and `assist` 1–6.

## Overlap

If a task qualifies as both, report it under Agent and say "also quick". Agent wins when review is cheaper than doing it.

## Confidence

Mark **unsure** when: the title is under about four words with no note, the rubric signals conflict, or calibration has a rule that nearly applies but not quite.
