---
name: getting-started
description: "Driver skill: take someone from a fresh Claude Code or Codex setup to a running ForkLaunch app. Plan by conversation, scaffold, then check after every pass. Routes to every other skill."
user-invokable: true
---

# Getting Started — the driver

## When to Use This Skill

- A fresh machine, or a fresh Claude Code / Codex session, and no app yet
- "Build me an app that does X"
- You are not sure which skill applies — start here and route from the table below
- You want the planning conversation the studio surface gives, in a terminal

This skill is the **driver**. It owns the loop; the others own the details.

## Before anything: is the environment ready?

Do not start planning on a machine that cannot build. Check in this order and
stop at the first failure:

```bash
node --version        # 22+
forklaunch --version  # the CLI
docker ps             # a container runtime that is actually running
git config user.email # git identity set
```

If any of those is missing, the setup walkthrough covers installing each one in
plain language, including the accounts and permissions a non-technical user has
to click through: **`SETUP.md`** in this pack. Send someone there rather than
improvising install instructions — it is written for a reader who has never
opened a terminal.

## The loop

```
  1. PLAN      conversation → a written plan the user has agreed to
  2. SCAFFOLD  forklaunch init application / init service
  3. PASS      generate or edit code
  4. CHECK     forklaunch analyze --report-card     ← after EVERY pass
  5. repeat 3–4 until the plan is delivered
  6. MILESTONE full analyze / report card, then deploy
```

Steps 3 and 4 are one unit. Never run a pass without the check after it.

### 1. Plan — the studio planning surface, as a conversation

The studio surface plans by **asking before it builds**. Reproduce that here.
No frontend, no preview pane — the questions and the written plan are the whole
surface.

**Ask before you plan.** One question at a time, plain language, and never more
than the user can answer without opening a file. The studio planner needs these
answered before it can produce operations, so ask them in this order:

1. What does the app do, in one sentence? Who uses it?
2. What are the main *things* it stores? (customers, bookings, invoices…)
3. Who logs in, and are there different kinds of user?
4. Does it take payments?
5. Does it hold anything sensitive — health, financial, or personal data?
6. Does anything need to happen on a schedule, or in the background?

Q5 is not optional and it is not a formality. It decides field classification,
which decides encryption, which is the single most expensive thing to retrofit.
Ask it plainly: *"Will this store anything you'd be uncomfortable seeing in a
data breach — medical details, card numbers, home addresses?"*

**Then write the plan back** and get explicit agreement before scaffolding:

- the modules to create, and why each one exists
- the entities in each, with their fields
- which fields are sensitive, and at what level
- what is deliberately **not** in scope for this pass

A user who says "yes, that's right" to a written plan has given you far more
than one who said "build me a booking app".

For a heavier review — scope challenge, architecture critique — use `/plan`,
`/plan-ceo-review` and `/plan-eng-review`. Use those when the app is large or
the cost of a wrong foundation is high, not for a first small app.

### 2. Scaffold

`/cli` has every command and flag. **Supply all flags** — the CLI drops into an
interactive prompt otherwise, which hangs a non-interactive session.

Foundational choices (module preset, database, auth provider) are expensive to
undo: changing one usually means re-scaffolding, not editing a file. State the
choice and its consequence before you commit to it.

### 3–4. Pass, then check — every time

After **every** codegen or edit pass, run the deterministic analysis:

```bash
forklaunch analyze --report-card
```

Read-only, no network, about a second. It runs the same checks as
`forklaunch compliance audit` and returns a scored card.

Act on it immediately:

- any `critical` or `high` finding → **fix before the next pass.** Every finding
  carries a `fix` field with a specific instruction.
- score dropped since the last pass → the pass you just ran caused it. Fix it
  now, while the change is one pass wide, not ten.
- score unchanged after a fix you believe landed → the fix did not take effect.
  Check that before concluding the check is wrong.

Why every pass and not at the end: these checks catch defects whose failure mode
is *silent* — code that returns correct-looking results and fails only in
production with real tenant data. Ten passes of drift is a bisect; one pass is a
glance. See `/compliance` and `/report-card`.

The structural snapshot from the same command is also the index the studio
planner consumes — same `appName` / `modules[]` / `entities` / `schemas` /
`routers` / `services` / `workers` shape — so it is what to re-read before
planning a follow-up change:

```bash
forklaunch analyze --pretty
```

### 6. Milestone — the full analyze

At milestones (before a deploy, before handing to a reviewer, end of a work
session), offer the full analyze. Ask; do not run it silently — it costs money
and time where the per-pass check costs neither.

> "Want me to run the full analysis? It scores all five readiness areas, not
> just the two the fast check covers, and produces a shareable report card."

```bash
forklaunch analyze --report-card --pretty         # fast, deterministic, 2 rails
forklaunch analyze --report-card --min-score 70   # same, as a CI gate
forklaunch compliance audit --risk-score --dpia   # full compliance surface
```

The fast check scores **compliance** and **security** only. Governance,
scalability and observability need judgement a source read cannot supply and
come back `pending` rather than zero. Quote the card's `caveat` whenever you
report a number. `/report-card` covers reading one properly.

## Which skill, when

| you are… | use |
|---|---|
| setting up a machine from scratch | `SETUP.md` in this pack |
| planning a new app or feature | this skill, then `/plan` for heavyweight review |
| running CLI commands | `/cli` — supply all flags |
| looking something up fast | `/quick-reference` |
| writing handlers, services, entities | `/backend-patterns`, `/common-tasks` |
| classifying fields, encryption, tenants | `/compliance` ← read before any entity with personal data |
| reading or gating on a readiness score | `/report-card` |
| iterating until a score passes | `/score-self-heal` |
| building UI | `/frontend-patterns`, `/design-system`, `/tanstack` |
| deploying a frontend | `/vercel-frontend` |
| deploying or operating infra | `/infra`, `/platform-architecture` |
| something is broken in a running app | `/investigator` ← start here for "it's down" |
| auth, secrets, rate limits | `/security` |
| logs, metrics, alerts | `/observability` |

Two are worth reading unprompted: **`/compliance`** before defining any entity
that holds personal data, and **`/investigator`** the moment something deployed
misbehaves.

## Keep the pack current

`forklaunch` self-updates its binary; the skill pack on disk does not. After a
CLI version change, or if an instruction stops matching what a command actually
does (a flag that no longer exists, a different error message), re-run:

```bash
forklaunch context
```

If a command you were told to run is missing or renamed, re-sync before
guessing at flags — the instructions you are holding may simply be stale.

## Close in plain language

Every session ends with a summary a non-technical person could read: what you
built, what the check said, what still needs their input. No paths, no stack
traces, no jargon — those belong above it. If something is uncertain or
half-done, say so; "I couldn't confirm the deploy finished" beats silence.

## Related

- `SETUP.md` — installing everything, for a non-technical reader
- `/report-card` — generating and reading a readiness score
- `/compliance` — classification, encryption, tenant isolation
- `/cli` — every command
- `/plan` — heavyweight planning pipeline
