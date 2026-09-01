---
name: score
description: "forklaunch score: generate an Enterprise-Readiness Report Card, read the five rails, gate CI on a minimum score, and know what deterministic checks can and cannot judge."
user-invokable: true
---

# Enterprise-Readiness Report Card

## When to Use This Skill

- "How ready is this app?" / "score my app" / "is this production-ready?"
- Generating a report card locally, or in CI
- Reading a card someone handed you and deciding what to fix first
- Gating a pipeline on a readiness score
- Understanding why a rail says "not assessed" instead of a number

## The one-sentence version

A report card scores an app across five areas and shows the evidence behind
each score. The CLI produces the part that can be proved from your source code,
offline, in about a second — and is honest about the part that needs judgement.

## Generate one

```bash
forklaunch score
```

This scores through the platform's analysis API, so you get a real **five-rail
agent-scored card** and a shareable link — not a number that vanishes with your
scrollback.

It packs the workspace, uploads it, polls the job, prints the card, and mints a
revocable share link:

```
Enterprise Readiness  72/100
…
Report card: https://forklaunch.com/report-card/<token>
```

**What it costs.** Analysis is metered — a free tier per account, then credits —
and takes minutes rather than seconds. It needs `forklaunch login`. So this is a
milestone action, not something to run after every edit.

**What it uploads.** A zip of the workspace. `.gitignore` is honoured, and
`.git`, `node_modules`, `target`, `dist` and friends are dropped regardless — so
a repo that forgot to ignore something large or secret does not silently send
it. Files over 2 MB are skipped.

### The offline escape hatch

```bash
forklaunch score --offline
```

No upload, no auth, no cost, about a second. It runs the same deterministic
checks as `forklaunch compliance audit` and scores **compliance and security
only** — the other three rails need judgement a source read cannot supply and
come back `pending`. Use this in the tight edit loop, and in CI where you have
no credentials.

| flag | what it does |
|---|---|
| *(none)* | upload, score, print the summary and a share link |
| `--offline` | deterministic checks only — no upload, no auth, no cost, two rails |
| `--no-share` | score but skip minting the link |
| `--json` | the raw report card, for tooling |
| `--pretty` | pretty-print the JSON |
| `--min-score N` | exit non-zero if `overall` is below N — for CI |
| `-p, --path <dir>` | app root (defaults to the manifest in the current directory) |

Gate a pipeline:

```bash
forklaunch score --min-score 70
```

Exit code 1 with `report card overall score N is below the required minimum of 70`.

## The five rails

| rail | weight | scored by the CLI? |
|---|---|---|
| Compliance | 0.25 | **yes** |
| Security | 0.25 | **yes** |
| Governance | 0.15 | no — needs judgement |
| Scalability | 0.15 | no — needs judgement |
| Observability | 0.20 | no — needs judgement |

### Why three rails say "not assessed"

Because a source read genuinely cannot decide them. Whether ownership and
change-control are healthy, whether the system survives its actual load,
whether the instrumentation covers what matters — none of that is visible in
the code.

Those rails come back with `pending: true` and are **excluded from the average**
rather than scored zero. That distinction matters: zeroes would cap every card
at 50 and read as *failure* when the truth is *absence*. `overall` is the
weighted mean of the rails that were actually scored.

To get all five, use `--upload` (agent-scored, needs auth and network) or the
studio surface. The card's own `caveat` field says which mode produced it —
read it before quoting a number at anyone.

## Reading a card

```json
{
  "schemaVersion": 2,
  "overall": 20,
  "headline": "acme: 27 deterministic finding(s) across 8 module(s) …",
  "caveat": "Deterministic checks only. …",
  "phase": "audit",
  "dimensions": {
    "compliance": {
      "score": 40,
      "items": [ { "label": "Field encryptor is registered", "status": "unmet", "detail": "…" } ],
      "findings": [ { "severity": "high", "title": "…", "fix": "…", "source": "cli" } ]
    },
    "governance": { "score": 0, "pending": true, "summary": "Not assessed. …" }
  }
}
```

Three fields carry the weight:

- **`items`** — the checklist. `met` / `unmet` / `pending`, one line per check.
  This is what to show a human; it reads as work done, not just work missing.
- **`findings`** — the detail behind a score. Every finding carries a `fix`.
- **`source`** — `cli` means deterministic and reproducible; `ai` means a model
  judged it. Never present the two as equally certain.

### Severity

`critical` costs 30 points, `high` 15, `medium` 8, `low` 4, `info` nothing. A
rail floors at 0.

Only one check is `critical`: **`tenant-context-half-wired`**. It is promoted
above the other warnings on evidence — it is the one whose failure mode is
silent. Rows filter correctly, tests pass, and encrypted columns quietly use
the wrong key until a real tenant exists in production. See `/compliance`.

## Fixing what it finds

Work the `findings` in severity order and apply each `fix` verbatim — they are
specific instructions, not categories. Then re-run:

```bash
forklaunch score
```

The score moves immediately, because these checks are deterministic. If a score
does **not** move after a fix you believe landed, the fix did not take effect —
check that before assuming the check is wrong.

For an iterative fix-until-threshold loop, `/score-self-heal` covers the same
motion against the full ForkLaunch Score.

## In the build loop

Run the fast, deterministic pass after **every** codegen pass — it is cheap and
catches drift immediately:

```bash
forklaunch score
```

Run the full agent-scored analyze at milestones, not every pass. See
`/getting-started` for where each fits in the loop.

## Honest limits

- **Absence of findings is not proof of readiness.** Eight checks, over two
  rails. A clean card means those eight passed.
- **`frameworks` is empty from the CLI.** Deciding whether HIPAA or SOC 2
  applies to a domain is judgement; guessing would be worse than saying nothing.
- **The overall score is renormalised.** A 100 from the CLI is "100 on the two
  rails it can judge", not "100 across five".

Always quote the caveat alongside the number. A deterministic 100 presented as
a full readiness score is the one genuinely misleading thing you can do with
this command.

## Related

- `/compliance` — what the checks mean and how to fix them properly
- `/score-self-heal` — iterate until a threshold passes
- `/cli` — every other CLI command
- `/getting-started` — where this sits in the build loop
