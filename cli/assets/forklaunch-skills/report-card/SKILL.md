---
name: report-card
description: "Enterprise-Readiness Report Card: generate one from the CLI, read the five rails, gate CI on a minimum score, and know what deterministic checks can and cannot judge."
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
forklaunch analyze --report-card --pretty
```

That is a **read-only** command. It runs the same deterministic checks as
`forklaunch compliance audit`, presents them on the shared report-card
contract, and prints JSON. No network, no auth, no writes.

| flag | what it does |
|---|---|
| `--report-card` | emit a card instead of the structural snapshot |
| `--pretty` | human-readable JSON |
| `--min-score N` | exit non-zero if `overall` is below N — for CI |
| `-m, --module <name>` | limit the structural half to one module |
| `-p, --path <dir>` | app root (defaults to the manifest in the current directory) |

Gate a pipeline:

```bash
forklaunch analyze --report-card --min-score 70
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
forklaunch analyze --report-card --pretty
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
forklaunch analyze --report-card
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
