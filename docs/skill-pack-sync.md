# Skill pack sync

Proposal. Not implemented.

## Problem

`fl context` writes the ForkLaunch skill pack into a user's project. The content comes from `cli/assets/forklaunch-skills/`, embedded into the binary at compile time via `include_dir!`.

The skills are authored in `forklaunch-platform/.claude/skills/`. Nothing connects the two. There is no `build.rs`, no CI step, and no reference to the platform repo anywhere in the build.

So `cli/assets/forklaunch-skills/` is a manual copy. It has one commit in its entire history, dated 2026-07-01. The platform skills have had 14 commits since.

Current state of the vendored pack:

| | |
|---|---|
| Identical to canonical | 15 files |
| Drifted | 8 files |
| Missing entirely | `infra`, `vercel-frontend` |
| `cli/SKILL.md` | 44 KB vs 72 KB canonical — 38% missing |

The missing `cli` content includes `fl observe` and `fl environment` configuration. An agent reading this pack will tell a user those commands do not exist.

Cutting a new release does not fix this. The build embeds whatever is committed in `cli/assets/`, so every future version ships the July 1 snapshot until a human copies the files across.

Separately, the pack currently ships content that is not ForkLaunch documentation:

| File | Size |
|---|---|
| `plan-devex-review/SKILL.md` | 94 KB |
| `plan-design-review/SKILL.md` | 94 KB |
| `gstack/SKILL.md` | 4.5 KB |
| `db-query.md` | 5.9 KB |

The first three are third-party workflow tooling. `db-query.md` is a production-database runbook. Roughly 200 KB of the pack is content no ForkLaunch user needs.

## Proposal

**1. Allowlist manifest**

`cli/assets/skills.toml` names the skills we ship and records the commit they came from.

```toml
source_repo = "forklaunch-platform"
source_commit = "59e403ab"
include = ["cli", "framework", "backend-patterns", "compliance", "..."]
```

An explicit list rather than a directory copy, so unrelated content cannot leak into the pack again.

**2. One script, two modes**

`scripts/sync-skills.ts`, reading from a sibling checkout of `forklaunch-platform` (path overridable by env var).

```
pnpm sync-skills           # copy allowlisted skills, update source_commit
pnpm sync-skills --check   # no writes; print drift and exit 1
```

**3. Release gate**

`--check` runs as the first step of the release. A release fails if the vendored pack does not match the platform repo.

This is the part that makes it work. Without it the script only runs when someone already suspects drift, which is the situation we are in now.

## Open question

`forklaunch-platform` is private; this repo is public. The check needs the platform repo on disk.

- **Local gate** — runs in the release script on a maintainer machine. Works today, no setup, but only binds maintainers.
- **CI gate** — needs a deploy key for the platform repo. Real enforcement, needs a secret.

Recommend starting local. Same script either way, so adding the key later is cheap.

## Scope

Manifest, script, `--check`, release hook: roughly 150-200 lines.

The existing drift is separate and larger. The first sync will produce a big re-vendoring diff and should be its own PR.
