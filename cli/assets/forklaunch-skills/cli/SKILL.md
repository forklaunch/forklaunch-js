---
name: cli
description: "CLI: init, change, delete, deploy, environment, release, sync, sdk, openapi."
user-invokable: true
---

# ForkLaunch CLI Skill

## Prerequisites

Before running any `forklaunch` command, verify the CLI is installed:

```bash
# Check if installed
forklaunch version

# If "command not found", install globally
npm install -g @forklaunch/cli
```

**When Claude invokes CLI commands, always check first:**

```bash
# Pre-flight check — install if missing
command -v forklaunch >/dev/null 2>&1 || npm install -g @forklaunch/cli
```

**Other prerequisites:**
- **Node.js** >= 20 (or Bun >= 1.1 if using `--runtime bun`)
- **Docker** — required for `docker compose up -d` (postgres, redis, etc.)
- **pnpm** (for Node runtime) or **bun** (for Bun runtime) as package manager

## When to Use This Skill

Use this skill when the user asks to:

- Create new services, workers, libraries, or routers in the Forklaunch platform
- Modify existing project components (changing databases, infrastructure, frameworks)
- Initialize a new Forklaunch application
- Work with the Forklaunch CLI commands
- Understand Forklaunch project structure and conventions
- Add or modify Forklaunch manifest configuration

## Overview

ForkLaunch is a TypeScript-first backend framework with incremental adoption, optional static typing, and code-driven architecture. The CLI provides powerful commands for managing modular monolith applications with services, workers, and libraries.

## CRITICAL: Supply ALL Arguments or the CLI Hangs

**The ForkLaunch CLI will drop into interactive mode if ANY required argument is missing.** Interactive mode blocks indefinitely when run from scripts, CI, or AI assistants — the process will hang waiting for stdin input that never comes.

**YOU MUST supply every required flag on the command line. There is no way to skip interactive mode other than providing all arguments.**

**The `--path` flag** specifies where to scaffold. It defaults to the current working directory but should always be explicit when running from a script or AI assistant.

**Package manager follows the runtime:** use `pnpm` for `--runtime node`, use `bun` for `--runtime bun`. This applies to all commands (`install`, `dev`, `test`, `migrate:*`, etc.).

**Bun runtime constraints:**

- `better-sqlite` database is NOT supported with Bun
- `hyper-express` is NOT compatible with Bun — the CLI forces `express` when `--runtime bun`

```bash
# Node runtime — use pnpm (ALL flags required to avoid interactive mode)
forklaunch init application my-app \
  --path . \
  --modules-path src/modules \
  --database postgresql \
  --runtime node \
  --validator zod \
  --http-framework express \
  --formatter biome \
  --linter oxlint \
  --test-framework vitest \
  --modules iam-better-auth billing-stripe \
  --license MIT \
  --author "Author Name" \
  --description "App description"
pnpm install && pnpm dev

# Bun runtime — use bun
forklaunch init application my-app \
  --path . \
  --modules-path src/modules \
  --database postgresql \
  --runtime bun \
  --validator zod \
  --http-framework express \
  --formatter biome \
  --linter oxlint \
  --test-framework vitest \
  --modules iam-better-auth billing-stripe \
  --license MIT \
  --author "Author Name" \
  --description "App description"
bun install && bun dev

# CORRECT — init a service with all flags
forklaunch init service billing --path ./src/modules --database postgresql --description "Billing service"

# WRONG — missing required flags, will hang in interactive mode
forklaunch init application my-app  # missing --database, --runtime, --modules, --formatter, --linter, --test-framework, etc.
```

**Complete flag reference for `init application`** (all should be provided):
| Flag | Required | Values |
|------|----------|--------|
| `--path` | Yes | Project directory path |
| `--modules-path` | Yes | `src/modules` or `modules` |
| `--database` | Yes | `postgresql`, `mysql`, `mariadb`, `mssql`, `mongodb`, `libsql`, `sqlite`, `better-sqlite` |
| `--runtime` | Yes | `node`, `bun` |
| `--validator` | Yes | `zod`, `typebox` |
| `--http-framework` | Yes | `express`, `hyper-express` |
| `--formatter` | Yes | `prettier`, `biome` |
| `--linter` | Yes | `eslint`, `oxlint` |
| `--test-framework` | Yes | `vitest`, `jest` |
| `--license` | Yes | `MIT`, `Apache-2.0`, `none`, etc. |
| `--author` | Yes | Author name string |
| `--modules` | Yes (non-interactive) | At least one module required: `iam-better-auth`, `iam-base`, `billing-stripe`, `billing-base`, `messaging-twilio`, `messaging-base` (can repeat `-m`) |
| `--description` | No | App description string |

## What Gets Generated

### `forklaunch init application`

Scaffolds a complete monorepo with:

- **`src/modules/`** — pnpm workspace for isolated backend modules (services, workers, libraries)
  - **`core/`** — shared package (`@{{app-name}}/core`) that re-exports framework primitives, schema validators, session schema, RBAC roles, feature flags
  - **`monitoring/`** — OpenTelemetry metrics definitions
  - **`client-sdk/`** — typed SDK client package for services
- **Docker Compose** — `docker-compose.yaml` with PostgreSQL, Redis, MinIO (S3), and all services as hot-reloading containers
- **`.forklaunch/manifest.toml`** — source of truth for project configuration (never edit manually)
- **Root `package.json`** — workspace root at `src/modules/`

**NOTE:** `init application` does NOT generate a frontend client. If you need a client (React, Next.js, etc.), create it separately (e.g., `npm create vite@latest client -- --template react-ts`). The client lives outside the pnpm workspace and connects to services via HTTP/WebSocket.

### `forklaunch init service`

Adds an isolated module under `src/modules/<name>/` with:

- Full DDD structure: `api/controllers/`, `api/routes/`, `domain/services/`, `domain/schemas/`, `persistence/entities/`
- `registrations.ts`, `bootstrapper.ts`, `server.ts`, `sdk.ts`
- `package.json` with `dev`, `build`, `test`, `migrate:*` scripts
- MikroORM config + migrations directory
- Docker Compose service entry with hot-reloading (`tsx watch`)

### `forklaunch init worker`

Same as service but with BullMQ/Kafka worker infrastructure instead of HTTP routes.

### `forklaunch init library`

Adds a shared library under `src/modules/<name>/` — no server, just exports.

### `forklaunch init module`

Adds a preconfigured module (billing or IAM) to an existing application:

```bash
forklaunch init module <name> --path <app-path> --module <module-type> --database <db>

# Module types:
# billing-base    — Billing app hooks only (no payment provider)
# billing-stripe  — Stripe billing implementation
# iam-base        — IAM authorization only (no auth provider)
# iam-better-auth — Better Auth implementation for IAM
# messaging-base    — Messaging hooks only (no delivery provider)
# messaging-twilio  — Twilio SMS implementation for messaging

# Example:
forklaunch init module billing --path ./src/modules --module billing-stripe --database postgresql
forklaunch init module iam --path ./src/modules --module iam-better-auth --database postgresql
forklaunch init module messaging --path ./src/modules --module messaging-twilio --database postgresql
```

### `forklaunch init router`

Adds a new controller + route + schema + service to an existing service or worker module.

## Workspace Architecture

```
my-app/                          # root pnpm workspace
├── package.json                 # workspaces: ["client", "src/modules/*"]
├── docker-compose.yml           # all services + infra (postgres, redis, minio)
├── .forklaunch/manifest.toml    # CLI source of truth (never edit manually)
├── client/                      # Next.js frontend
│   ├── package.json
│   ├── app/
│   ├── components/
│   └── lib/api.ts              # imports from universal-sdk
└── src/modules/                 # pnpm workspace for backend
    ├── pnpm-workspace.yaml
    ├── core/                    # @{{app-name}}/core — shared re-exports
    ├── monitoring/              # OpenTelemetry metrics
    ├── universal-sdk/           # auto-generated SDK
    ├── iam/                     # IAM service (auth, users, orgs)
    ├── billing/                 # billing service
    ├── my-service/              # your service
    └── my-worker/               # your worker
```

**Key design:**

- Each module is an **isolated package** with its own `package.json`, `node_modules`, and build
- Modules import shared code from `@{{app-name}}/core` (never cross-import directly)
- Docker Compose mounts each module as a volume with `tsx watch` for hot-reloading
- The `client/` lives at the top level alongside `src/modules/`, both in the root workspace
- `universal-sdk` auto-generates typed clients from each service's OpenAPI spec

## All CLI Commands

The Forklaunch CLI provides these commands:

| Command       | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `init`        | Initialize new projects (app, service, worker, library, router) |
| `change`      | Modify existing projects                                        |
| `delete`      | Remove projects                                                 |
| `deploy`      | Deploy applications to cloud                                    |
| `environment` | Manage environments                                             |
| `release`     | Create and manage releases                                      |
| `integrate`   | Integrate with external services                                |
| `openapi`     | Generate OpenAPI specifications                                 |
| `sdk`         | Generate client SDKs                                            |
| `sync`        | Sync local and remote state                                     |
| `config`      | Pull/push environment configuration                             |
| `depcheck`    | Check dependency alignment                                      |
| `eject`       | Eject from Forklaunch management                                |
| `login`       | Authenticate with platform                                      |
| `logout`      | Log out from platform                                           |
| `whoami`      | Show current user                                               |
| `version`     | Show CLI version                                                |
| `observe`     | Inspect logs, metrics, traces, and live health for an app        |

## Core Commands

### 1. Project Initialization (`init`)

Initialize new Forklaunch projects.

#### Initialize Application

```bash
forklaunch init app <app_name>

# Options:
--database <type>        # postgresql, mysql, mariadb, mssql, mongodb, libsql, sqlite, better-sqlite
--runtime <type>         # node, bun
--validator <type>       # zod, typebox
--http-framework <type>  # express, hyper-express (bun forces express)
--test-framework <type>  # vitest, jest
--formatter <type>       # prettier, biome
--linter <type>          # eslint, oxlint
--modules <module>       # billing-base, billing-stripe, iam-base, iam-better-auth (can repeat -m)

# Example:
forklaunch init app my-platform --runtime bun --http-framework express
```

#### Initialize Service

```bash
forklaunch init service <service_name>

# Options:
--path <app-path>       # Application path to scaffold in
--description "Service description"
--database postgresql|mysql|mariadb|mssql|mongodb|libsql|sqlite|better-sqlite
--infrastructure redis|s3  # Can specify multiple: -i redis,s3
--mappers               # Generate mapper files for entity/DTO transformation

# Example:
forklaunch init service billing --path ./src/modules --database postgresql --description "Billing service"
```

#### Initialize Worker

```bash
forklaunch init worker <worker_name>

# Options:
--path <app-path>       # Application path to scaffold in
--type bullmq|kafka|database|redis
--database postgresql|mysql|mariadb|mssql|mongodb|libsql|sqlite|better-sqlite  # Only for database workers
--description "Worker description"
--mappers               # Generate mapper files

# Example:
forklaunch init worker email-worker --path ./src/modules --type bullmq
```

#### Initialize Library

```bash
forklaunch init library <library_name>

# Options:
--description "Library description"

# Example:
forklaunch init library shared-utils
```

#### Initialize Router

```bash
forklaunch init router <router_name> --path <service_directory>

# Options:
--path <path>            # Path to the service directory (must be inside a service)
--infrastructure redis|s3  # Optional: add infrastructure support (can repeat)
--dryrun                 # Preview changes without applying

# Example:
forklaunch init router user-profile --path ./src/modules/platform-management
forklaunch init router payments --path ./src/modules/billing --infrastructure redis
```

### 2. Change Commands (`change`)

Modify existing project components safely.

#### Change Application

```bash
forklaunch change application [--path <app_root>]

# Options:
--path <path>            # Application root (default: current directory)
--runtime bun|node
--http-framework express|hyper-express
--formatter prettier|biome
--linter eslint|oxlint
--test-framework vitest|jest
--validator zod|typebox
-N <name>                # Rename the application
-D "description"         # Update description
--dryrun                 # Preview changes without applying
--confirm                # Skip confirmation prompts

# Example:
forklaunch change application --runtime bun --formatter biome --dryrun
forklaunch change application --runtime bun --formatter biome
```

#### Change Service

```bash
forklaunch change service [--path <service_directory>]

# Options:
--path <path>            # Service path (default: current directory)
--database postgresql|mysql|mariadb|mssql|mongodb|libsql|sqlite|better-sqlite
--infrastructure redis|s3
-N <name>                # Rename the service
-D "description"         # Update description
--to worker              # Convert service to worker (requires -t)
-t bullmq|kafka|database|redis  # Worker type (required with --to worker)
--dryrun                 # Preview changes without applying
--confirm                # Skip confirmation prompts

# Example:
forklaunch change service --path ./src/modules/my-service --database postgresql --dryrun
forklaunch change service --path ./src/modules/email --to worker --type bullmq --dryrun
```

#### Change Worker

```bash
forklaunch change worker [--path <worker_directory>]

# Options:
--path <path>            # Worker path (default: current directory)
--type bullmq|kafka|database|redis
--database postgresql|mysql|mariadb|mssql|mongodb|libsql|sqlite|better-sqlite
-N <name>                # Rename the worker
-D "description"         # Update description
--to service             # Convert worker to service
--dryrun                 # Preview changes without applying
--confirm                # Skip confirmation prompts

# Example:
forklaunch change worker --path ./src/modules/email-worker --type kafka
forklaunch change worker --path ./src/modules/email-worker --to service --dryrun
```

#### Change Router

```bash
forklaunch change router [--path <service_directory>]

# Options:
--path <path>            # Service path (must be inside a service directory)
-e <existing-name>       # Current name of the router to change
-N <new-name>            # Rename the router
--add-mappers            # Generate mapper files from existing schemas and entities
--dryrun                 # Preview changes without applying
--confirm                # Skip confirmation prompts

# Example:
forklaunch change router --path ./src/modules/platform-management -e user-profile -N user-management --dryrun
forklaunch change router --path ./src/modules/billing --add-mappers
```

### 3. Delete Commands (`delete`)

Remove project components.

**CRITICAL: `delete` always prompts for confirmation and has NO flag to skip it** (`--confirm` is rejected). In scripts, CI, or AI-assistant contexts the prompt fails with `Error: EOF`. The only non-interactive workaround is piping "y" to stdin:

```bash
# Non-interactive (required for scripts/agents):
printf 'y\n' | forklaunch delete service <service_name> --path .
printf 'y\n' | forklaunch delete worker <worker_name> --path .
printf 'y\n' | forklaunch delete library <library_name> --path .
printf 'y\n' | forklaunch delete router <router_name> --path <service_directory>

# Examples:
printf 'y\n' | forklaunch delete service old-billing --path .
printf 'y\n' | forklaunch delete router legacy-api --path ./src/modules/platform-management
```

After deleting a module that was previously converted (service↔worker), grep `docker-compose.yaml` for stale entries of the old type — conversions leave orphaned compose blocks that delete does not clean up.

### 4. Deploy Commands (`deploy`)

Deployment management. Two subcommands: `create` and `destroy`. Requires the app to be integrated (`forklaunch integrate`) and a release to exist (`forklaunch release create`).

```bash
forklaunch deploy create --release <version> --environment <env> --region <region>

# Options:
-r, --release <version>       # Release version to deploy (required) [aliases: -v]
-e, --environment <env>       # Environment name (required)
    --region <region>         # AWS region (required)
    --node-env <env>          # NODE_ENV for the deployment — REQUIRED non-interactively;
                              #   without it the CLI prompts and dies in non-TTY
                              #   ("Failed to read NODE_ENV selection: not a terminal")
    --distribution-config <c> # centralized | distributed
    --dry-run                 # Preview: component plan + env-var resolution, no deploy
    --no-wait                 # Don't wait for completion
-p, --path <base_path>        # Application root (optional)

forklaunch deploy destroy --environment <env> --region <region>

# Options:
-e, --environment <env>       # Environment name (required)
    --region <region>         # AWS region (required)
    --mode all|preserve-data  # preserve-data keeps databases
    --no-wait

# Examples (always include --node-env when scripted):
forklaunch deploy create -r 0.0.1 -e development --region us-east-1 --node-env development --dry-run
forklaunch deploy create -r 1.2.0 -e production --region us-east-1 --node-env production --no-wait
forklaunch deploy destroy -e development --region us-east-1 --mode preserve-data
```

`--dry-run` requires the target environment to already exist ("Environment not found" otherwise). Environments are created in the Platform UI — or as a side effect of `config push` (see Config Commands).

### 5. Environment Commands (`environment`)

Manage environment **variables** across workspace projects (local only — this is NOT platform environment management).

```bash
# Check all workspace projects for missing environment variables
forklaunch environment validate
# Exits 1 and lists every missing var per project — expected on a fresh scaffold.

# Add missing variables with BLANK values (placeholders, not real config)
forklaunch environment sync
forklaunch environment sync -n   # dry-run: prints the sync plan

# Examples:
forklaunch environment validate
forklaunch environment sync --dry-run
```

Note: these commands take no `--path` flag — run them from the application root.

### 6. Release Commands (`release`)

Create releases on the platform. `create` is the only subcommand.

```bash
forklaunch release create --version <version>

# Options:
-v, --version <version>  # Release version, e.g. 1.0.0 (required) [aliases: -r, --release]
-n, --notes <notes>      # Release notes
    --dry-run            # Run the full pipeline but skip uploading to the platform
    --local              # Package local code and upload to S3 (skips mode prompt)
    --git                # Git-based release flow (skips mode prompt)
    --skip-sync          # Skip automatic project sync before the release
-y, --yes                # Skip confirmation prompts (REQUIRED for non-interactive use)
-p, --path <base_path>   # Application root (optional)

# Examples:
forklaunch release create -v 0.0.1 --dry-run --local --skip-sync -y
forklaunch release create -v 1.0.0 --local --skip-sync -y
```

The pipeline runs: install → build → OpenAPI export → env-var/dependency/integration detection → manifest generation → (upload). Works in a non-git directory (`--local` warns and uses local defaults). Always pass one of `--local`/`--git` plus `-y` when scripted, or the mode-selection prompt hangs.

### 7. Integrate Commands (`integrate`)

Link the local application to a ForkLaunch platform application. The platform application must already exist (created via the dashboard — there is no CLI command to create one). If the `gstack` skills are available in this project, `/browse` can drive the dashboard directly (navigate, log in, click "Create Application") instead of asking the user to do it by hand — but always ask the user's permission first, since it acts on their real logged-in account.

```bash
forklaunch integrate --app <platform-application-id>

# Options:
-a, --app <app>         # Platform application ID to link to (required)
-p, --path <base_path>  # Application root (optional)

# Example:
forklaunch integrate -a 8f4e45ef-3261-4d8a-9e3e-a9187861e7d3 --path .
```

On success this writes `platform_application_id` into `.forklaunch/manifest.toml` and unlocks `config`, `release`, and `deploy`. Every platform command errors with "Application not integrated with platform" until this runs.

### 8. OpenAPI Commands (`openapi`)

Export OpenAPI specifications from services. `export` is the only subcommand.

```bash
forklaunch openapi export

# Options:
-o, --output <path>     # Output directory (default: .forklaunch/openapi)

# Example:
forklaunch openapi export
```

Prerequisites: `pnpm install` AND `pnpm build` must have run first (export boots each service to extract its spec; it needs `@<app>/core`'s built `lib/`). Requires CLI >= 1.2.6 — on 1.2.3 export mode crashes with a body-parser `option limit ""` error.

### 9. SDK Commands (`sdk`)

Manage the SDK mode used by module package.jsons.

```bash
forklaunch sdk mode --type <generated|live>

# Options:
-t, --type <type>       # generated | live
-n, --dryrun            # Preview which package.json files would be rewritten

# Examples:
forklaunch sdk mode -t generated -n
forklaunch sdk mode -t generated
```

### 10. Sync Commands (`sync`)

Reconcile the manifest, module directories, and docker-compose with each other. This is a **local** operation — it does not talk to the platform.

```bash
forklaunch sync all        # Sync every project in the modules directory
forklaunch sync service <name>
forklaunch sync worker <name>
forklaunch sync library <name>

# Options (sync all ONLY — the per-type subcommands reject these):
-c, --confirm            # Skip confirmation prompts
-P, --prompts <JSON>     # Pre-provided answers for prompts

# Examples:
forklaunch sync all -c
forklaunch sync service inventory
```

`sync all` also adds missing env vars to `.env.local` files and docker-compose service entries (ENCRYPTION_KEY, DOTENV_FILE_PATH, OTEL_LEVEL, IAM_URL) — useful for partially healing fresh-scaffold env gaps. It does NOT restore compose services dropped by other commands (see Known Scaffold Bugs).

### 11. Config Commands (`config`)

Pull and push environment configuration between local `.env` files and the platform. Requires an integrated app (`forklaunch integrate`) and a login. The app ID comes from the manifest — there is no `--app` flag.

```bash
# Pull environment config to a local .env file
forklaunch config pull -r <REGION> -e <ENV> [-s <SERVICE>] [-o <FILE>]

# Push a local .env file to the platform
forklaunch config push -r <REGION> -e <ENV> [-i <FILE>]

# Options for pull:
-r, --region <region>       # e.g. us-east-1 (required)
-e, --environment <env>     # e.g. production, development (required)
-s, --service <service>     # Filter to a specific service
-o, --output <file>         # Output path (defaults to <environment>.env)

# Options for push:
-r, --region / -e, --environment  # required
-i, --input <file>          # Input path (defaults to <environment>.env)

# Examples:
forklaunch config pull -r us-east-1 -e development -o .env.development
forklaunch config push -r us-east-1 -e development -i ./development.env
```

Behavioral asymmetry to know: `config pull` fails with "Environment not found" if the environment doesn't exist yet, but `config push` **auto-creates** the environment. On a never-deployed app, push first, then pull.

The `.env` file uses comment headers to separate variables by source:

```env
# application
DATABASE_URL=postgres://...

# billing-service (svc-id-123)
STRIPE_KEY=sk_test_...
```

### 12. Dependency Check (`depcheck`)

Check that dependency versions are aligned across workspace projects.

```bash
forklaunch depcheck [--path <base_path>]
```

`--path` is the only option (no --fix/--strict). CAUTION: depcheck compares declared ranges, not resolved versions — it reports "No conflicting packages" even when two versions of the same package are installed transitively (e.g. the historical duplicate `@mikro-orm/core`). Treat a clean depcheck as necessary, not sufficient; verify with `pnpm why <pkg>` when builds show type mismatches between identical-looking types.

### 13. Eject Command (`eject`)

Eject from Forklaunch management (irreversible).

```bash
forklaunch eject [OPTIONS]

# Options:
-p, --path <base_path>                  # Application root path
-d, --dependencies [<dependencies>...]  # The dependencies to eject
-n, --dryrun                            # Dry run
-c, --continue                          # Continue a previous eject operation
```

**BROKEN as of v1.2.3–v1.2.6 — do not rely on it.** Every invocation form fails: relative `--path` values panic the CLI (`unwrap() on None`), absolute paths error "Base path is not correct" (and exit 0 despite the error), and the no-path prompt panics in non-TTY contexts. There is no known working invocation. If ejection is required, remove `.forklaunch/` and forklaunch-specific scripts manually.

### 14. Authentication Commands

#### Login

```bash
forklaunch login                 # Interactive: browser device-auth flow (visit URL + code)
forklaunch login -t <API_TOKEN>  # API token (for CI)
FORKLAUNCH_API_TOKEN=<token>     # Env-var alternative
```

CAUTION: `login -t` does NOT actually validate the token despite printing "Validating API token... Successfully logged in!" — an invalid token only surfaces on the next API call ("Failed to reach platform API"). Verify with `forklaunch whoami` immediately after a token login.

Sessions use a short-lived JWT. When it expires, platform commands (including `compliance audit -e`) silently start a NEW interactive browser device-auth flow instead of erroring — in headless contexts this hangs forever. If a platform command hangs, check `forklaunch whoami` in another shell and re-login.

#### Logout

```bash
forklaunch logout
```

#### Whoami

```bash
forklaunch whoami

# Shows: Name, Email, Organization, Role, Plan
```

Note: running any command inside a repo whose manifest `cli_version` doesn't match the installed CLI triggers a version-gate prompt; in non-TTY contexts this surfaces as a bare `Error: EOF` after the version warning. Scaffold test apps with the CLI version you'll run against them.

### 15. Version Command

```bash
forklaunch version   # Prints the CLI version (e.g. 1.2.6)
```

### 16. Observe Commands (`observe`)

Inspect logs, metrics, traces, and live health for a deployed application — the CLI equivalent of the dashboard's Monitoring tab. Five subcommands: `status`, `logs`, `metrics`, `traces`, `issues`.

```bash
# One-screen health summary for an environment
forklaunch observe status -e development

# Query or live-tail logs
forklaunch observe logs -e development [-s <service>] [--level error|warn|info|debug] [--since <ISO timestamp>] [--limit N] [-f/--follow] [--json]

# Query metrics (PromQL)
forklaunch observe metrics -e development [--time-range 15m|1h|6h|24h|7d|30d] [--query <promql>] [--json]

# Query distributed traces
forklaunch observe traces -e development [--trace-id <id>] [--limit N] [--time-range ...] [--json]

# List or acknowledge active issues
forklaunch observe issues -e development [--severity ERROR|ALERT|INCIDENT] [--status open|acknowledged] [--json]
forklaunch observe issues ack <issue-id>

# Examples:
forklaunch observe logs -e development -s iam --level error --limit 50
forklaunch observe logs -e production -s iam -f          # live-tail
forklaunch observe status -e development --json
```

All subcommands take `-e/--environment` (required) and `-p/--path` (optional, defaults to cwd); `metrics`/`traces` also take `--app-id` (defaults to the manifest's `platform_application_id`). `--json` on any subcommand switches to machine-readable output — useful for scripting or piping into other tools.

### Modifying Components

**Change Application Settings:**

```bash
forklaunch change application

# Options:
--runtime bun|node
--http-framework express|hyper-express
--formatter prettier|biome
--linter eslint|oxlint
--test-framework vitest|jest
--validator zod|typebox
--dry-run              # Preview changes without applying
```

**Change Services:**

```bash
forklaunch change service <service_name>

# Options:
--database postgresql|mysql|mariadb|mssql|mongodb|libsql|sqlite|better-sqlite
--infrastructure redis|s3
--new-name <name>
--description "New description"
--dry-run
```

**Change Workers:**

```bash
forklaunch change worker <worker_name>

# Options:
--type bullmq|kafka|database
--database postgresql|mysql|mariadb|mssql|mongodb|libsql|sqlite|better-sqlite
--new-name <name>
--description "New description"
--dry-run
```

**Change Routers:**

```bash
forklaunch change router --path <service_directory> -e <existing-name> -N <new-name>

# Options:
--path <path>            # Service path (default: current directory)
-e <existing-name>       # Current router name
-N <new-name>            # New router name
--add-mappers            # Generate mapper files from existing schemas
--dryrun
--confirm
```

### Deleting Components

```bash
# delete always prompts and has no skip flag — pipe "y" when scripted:
printf 'y\n' | forklaunch delete service <service_name> --path .
printf 'y\n' | forklaunch delete worker <worker_name> --path .
printf 'y\n' | forklaunch delete library <library_name> --path .
printf 'y\n' | forklaunch delete router <router_name> --path <service_directory>
```

### Development Utilities

```bash
# Check dependency alignment across projects
forklaunch depcheck

# Eject from ForkLaunch management
forklaunch eject

# Pull/push environment configuration (app id comes from the manifest after `integrate`)
forklaunch config pull -r <REGION> -e <ENV>
forklaunch config push -r <REGION> -e <ENV>
```

### Platform Commands

```bash
# Authentication
forklaunch login
forklaunch logout
forklaunch whoami

# Version info
forklaunch version
```

## Forklaunch Best Practices

### 1. Project Structure Conventions

#### Service Structure

```
src/modules/<service-name>/
├── api/
│   ├── controllers/     # HTTP request handlers
│   ├── routes/         # Route definitions
│   └── middleware/     # Service-specific middleware
├── domain/
│   ├── services/       # Business logic
│   ├── schemas/        # Validation schemas (Zod/TypeBox)
│   ├── types/          # TypeScript types
│   └── utils/          # Domain utilities
├── persistence/
│   ├── entities/       # Database entities (MikroORM)
│   ├── repositories/   # Data access layer
│   └── migrations/     # Database migrations
├── registrations.ts    # Dependency injection setup
├── server.ts          # Service entry point
└── worker.ts          # Worker entry point (if applicable)
```

#### Worker Structure

```
src/modules/<worker-name>/
├── api/
│   ├── controllers/     # Worker job handlers
│   └── routes/         # Worker queue routes
├── domain/
│   ├── services/       # Processing logic
│   ├── schemas/        # Validation schemas
│   └── types/          # TypeScript types
├── registrations.ts    # Dependency injection
└── worker.ts          # Worker entry point
```

#### Library Structure

```
src/modules/<library-name>/
├── domain/
│   ├── services/       # Shared services
│   ├── types/          # Shared types
│   └── utils/          # Shared utilities
└── index.ts           # Public exports
```

### 2. Naming Conventions

- **Services**: Lowercase with hyphens (e.g., `platform-management`, `user-auth`)
- **Workers**: Lowercase with hyphens, `-worker` suffix (e.g., `deployment-agent-worker`)
- **Libraries**: Lowercase with hyphens (e.g., `core`, `monitoring`, `universal-sdk`)
- **Routers**: camelCase (e.g., `billingPortal`, `organizationManagement`)
- **Files**: Lowercase with hyphens (e.g., `deployment.service.ts`, `user.entity.ts`)
- **Classes**: PascalCase (e.g., `DeploymentService`, `UserEntity`)

### 3. File Naming Patterns

Follow these patterns consistently:

- Controllers: `<name>.controller.ts`
- Services: `<name>.service.ts`
- Entities: `<name>.entity.ts`
- Schemas: `<name>.schema.ts`
- Types: `<name>.types.ts`
- Routes: `<name>.routes.ts`
- Tests: `<name>.test.ts` or `<name>.spec.ts`

### 4. Dependency Injection Pattern

Always use the registrations.ts pattern:

```typescript
// registrations.ts
import { DependencyContainer } from "@forklaunch/core";

export function registerDependencies(container: DependencyContainer) {
  // Register services
  container.registerSingleton("DeploymentService", DeploymentService);
  container.registerSingleton("PulumiGeneratorService", PulumiGeneratorService);

  // Register repositories
  container.registerSingleton("DeploymentRepository", DeploymentRepository);
}
```

### 5. Manifest-Driven Development

The `.forklaunch/manifest.toml` is the source of truth:

- DO NOT manually edit the manifest - use CLI commands
- The manifest tracks all services, workers, libraries, and routers
- Contains application-wide configuration (runtime, frameworks, tools)
- Used for infrastructure generation and deployment

### 6. Router Organization

Group related endpoints into routers:

- One router per resource or domain concept
- Use descriptive router names (e.g., `deployment`, `application`, `user`)
- Keep routers focused and cohesive

### 7. Database and Infrastructure

**Database Configuration:**

- Services typically use `postgresql` in production
- Use `redis` for caching and session storage
- Workers can use `bullmq` (backed by Redis) for job queues

**Infrastructure Resources:**

```toml
[projects.resources]
database = "postgresql"
cache = "redis"

# For workers
[projects.resources]
cache = "bullmq"
```

### 8. Testing Patterns

Follow the testing hierarchy:

```
<module>/
├── domain/
│   └── services/
│       └── __test__/
│           └── deployment.service.test.ts
├── api/
│   └── controllers/
│       └── __test__/
│           └── deployment.controller.test.ts
```

### 9. Import Organization

Order imports consistently:

```typescript
// 1. External dependencies
import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";

// 2. Forklaunch framework
import { BaseService } from "@forklaunch/core";
import { z } from "@forklaunch/validator/zod";

// 3. Internal cross-module imports
import { CoreLogger } from "@modules/core";

// 4. Local module imports
import { DeploymentService } from "../services/deployment.service";
import { DeploymentSchema } from "../schemas/deployment.schema";
```

### 10. Safe Change Workflow

Always follow this workflow when modifying projects:

```bash
# 1. Commit current state
git add .
git commit -m "Before changing database to PostgreSQL"

# 2. Preview changes
forklaunch change service my-service --database postgresql --dry-run

# 3. Make the change
forklaunch change service my-service --database postgresql

# 4. Install dependencies
pnpm install  # or bun install

# 5. Test
pnpm test
pnpm dev

# 6. Commit changes
git add .
git commit -m "Changed my-service database to PostgreSQL"
```

### 11. Development Commands

All commands use `pnpm` (or `bun` if runtime is bun). These are run from the **root** of the project.

```bash
# First time setup (run in order)
pnpm install            # Install all dependencies
pnpm dev                # Start Docker Compose (postgres, redis, minio, all services)
pnpm database:setup     # Apply migrations + seed data (run AFTER pnpm dev, services must be up)

# IMPORTANT: pnpm database:setup must run AFTER pnpm dev
# The database container must be running before migrations can execute.
# Order: pnpm dev → wait for services → pnpm database:setup

# Daily development
pnpm dev                # Start all services (docker compose up with hot-reload)

# Database operations (run from individual module dir OR root)
pnpm database:setup     # Migrations + seed (requires running containers)
pnpm migrate:create     # Create new migration
pnpm migrate:up         # Run pending migrations
pnpm migrate:down       # Rollback last migration

# Testing
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage

# Code quality
pnpm lint              # Run linter
pnpm format            # Format code
pnpm type-check        # TypeScript type checking
```

### 12. Preconfigured Modules

ForkLaunch supports preconfigured modules for common functionality:

| Module            | Description                               |
| ----------------- | ----------------------------------------- |
| `billing-base`    | Billing hooks only (no payment provider)  |
| `billing-stripe`  | Full Stripe billing integration           |
| `iam-base`        | IAM authorization only (no auth provider) |
| `iam-better-auth` | Better Auth authentication implementation |

Add modules during `init application` with `-m` (repeatable) or later with `init module`:

```bash
# During application init
forklaunch init application my-app ... -m billing-stripe -m iam-better-auth

# Add to existing application
forklaunch init module billing --path ./src/modules --module billing-stripe --database postgresql
forklaunch init module iam --path ./src/modules --module iam-better-auth --database postgresql
forklaunch init module messaging --path ./src/modules --module messaging-twilio --database postgresql
```

### 13. Incremental Adoption

Forklaunch can be adopted incrementally:

- Drop into existing Express apps
- Upgrade routes one at a time
- Use framework features as needed
- No lock-in - you can always eject

### 14. Multi-Environment Configuration

Structure environment-specific config:

```
.env.local          # Local development
.env.development    # Development environment
.env.staging        # Staging environment
.env.production     # Production environment
```

### 15. OpenAPI and SDK Generation

Forklaunch auto-generates:

- OpenAPI specs from route definitions
- AsyncAPI specs for workers
- Type-safe SDKs for clients
- OpenTelemetry metrics, logs, traces

Specs are available at:

- `.forklaunch/openapi/<module>/openapi.json`
- `.forklaunch/openapi/<module>/asyncapi.json`

## Handler Contract Details & Typed req/res

ForkLaunch handlers use a **contract object** as the second argument to `handlers.get()`, `handlers.post()`, etc. The contract drives full type inference for the `req` and `res` callback parameters — no manual type annotations needed.

### Contract Fields

| Field             | Drives Type Of                     | Description                                      |
| ----------------- | ---------------------------------- | ------------------------------------------------ |
| `name`            | —                                  | Handler name (used in OpenAPI and tracing)       |
| `summary`         | —                                  | Handler description                              |
| `params`          | `req.params`                       | URL path parameters (e.g. `{ id: string }`)      |
| `query`           | `req.query`                        | Query string parameters                          |
| `body`            | `req.body`                         | Request body (POST/PUT/PATCH only)               |
| `requestHeaders`  | `req.headers`                      | Typed request headers                            |
| `responseHeaders` | `res.setHeader()`                  | Typed response headers (constrains allowed keys) |
| `responses`       | `res.status(N).json()` / `.send()` | Map of status code → response body type          |
| `auth`            | `req.session`                      | Authentication config (see below)                |
| `options`         | —                                  | Validation mode, MCP/OpenAPI toggles             |

### How Typing Works

```typescript
export const getUser = handlers.get(
  schemaValidator,
  "/:id",
  {
    name: "Get User",
    summary: "Gets a user by ID",
    params: { id: string }, // → req.params.id: string
    query: { includeRoles: optional(boolean) }, // → req.query.includeRoles?: boolean
    requestHeaders: { "x-tenant": string }, // → req.headers['x-tenant']: string
    responseHeaders: { "x-request-id": string }, // → res.setHeader('x-request-id', ...)
    access: "protected",
    auth: {
      sessionSchema: SHARED_SESSION_SCHEMA,
      jwt: { jwksPublicKeyUrl: JWKS_URL },
      allowedRoles: PLATFORM_VIEWER_ROLES,
    },
    responses: {
      200: { id: string, name: string }, // → res.status(200).json({ id, name })
      404: string, // → res.status(404).send('Not found')
      500: string,
    },
  },
  async (req, res) => {
    // req.params, req.query, req.body, req.headers, req.session — all fully typed
    // res.status(200).json() — only accepts the shape defined in responses[200]
    // res.setHeader('x-request-id', '...') — only accepts keys from responseHeaders
  },
);
```

### Key Typing Rules

1. **`req.params`** — Inferred from `params` in the contract. If the path has `:id`, the contract must include `params: { id: ... }`.
2. **`req.body`** — Only available for `handlers.post()`, `.put()`, `.patch()`. Typed from `body` field. Supports multiple content types:
   - Plain object → `application/json` (default)
   - `{ text: string, contentType?: 'text/plain' }` → text body
   - `{ file: file, contentType?: 'application/octet-stream' }` → file upload
   - `{ multipartForm: { ... } }` → multipart form data
   - `{ event: { id: string, data: ... } }` → server-sent events
3. **`req.query`** — Typed from `query` field. Use `optional(...)` for optional query params.
4. **`req.session`** — Typed from `auth.sessionSchema`. Contains JWT payload fields plus your custom schema. Only available when `auth` is configured.
5. **`res.status(N)`** — Returns a typed response object. `.json()` accepts the type defined at `responses[N]`, `.send()` accepts string/buffer when `responses[N]` is `string`.
6. **`res.setHeader(key, value)`** — Key is constrained to keys defined in `responseHeaders` plus framework headers (`x-correlation-id`). Omitting `responseHeaders` means only framework headers are allowed.
7. **`responses`** — Status codes map to response body types. The type system enforces that you call `res.status()` with a declared code and pass the matching body shape.

### Auth Variants

```typescript
// JWT with roles
access: 'protected',
auth: {
  sessionSchema: SHARED_SESSION_SCHEMA,
  jwt: { jwksPublicKeyUrl: JWKS_URL },
  allowedRoles: PLATFORM_VIEWER_ROLES
}

// JWT with permissions
access: 'protected',
auth: {
  sessionSchema: SHARED_SESSION_SCHEMA,
  jwt: { jwksPublicKeyUrl: JWKS_URL },
  allowedPermissions: new Set(['platform:read'])
}

// HMAC (internal service-to-service)
access: 'internal',
auth: {
  hmac: { secretKeys: { default: HMAC_SECRET_KEY } }
}

// Basic auth
access: 'authenticated',
auth: {
  basic: { login: (user, pass) => user === 'admin' && pass === 'secret' }
}
```

### Schema Primitives

Import from `@forklaunch-platform/core` (or `@forklaunch/validator`):

```typescript
import {
  string,
  number,
  boolean,
  date,
  optional,
  array,
  record,
  union,
  literal,
  enum_,
  type,
  unknown,
  any,
  file,
  binary,
  uuid,
  email,
  uri,
  null_,
  undefined_,
  never,
  void_,
} from "@forklaunch-platform/core";
```

These are validator-agnostic (work with both Zod and TypeBox). The simple ones (`string`, `number`, `boolean`, `date`) are bare values used directly in schema objects. The complex ones are functions:

#### `optional(schema)` — Makes a field optional

```typescript
// req.query.service is string | undefined
query: { environment: string, service: optional(string) }
```

#### `array(schema)` — Array of items

```typescript
// Typed array of objects
body: {
  tags: array(string);
} // string[]
body: {
  items: array({ key: string, value: string });
} // { key: string; value: string }[]
```

#### `record(keySchema, valueSchema)` — Dynamic key-value map

```typescript
// Record<string, unknown> — arbitrary metadata
body: {
  metadata: record(string, unknown);
}

// Record<string, number> — string keys, number values
body: {
  scores: record(string, number);
}
```

#### `literal(value)` — Exact constant value

```typescript
// Must be exactly the string "active"
body: {
  status: literal("active");
}

// Combine with union for string literal unions
body: {
  direction: union([literal("asc"), literal("desc")]);
}
```

#### `union(schemas[])` — One of several types

Takes an **array** of schemas. The value must match exactly one:

```typescript
// string | number
body: {
  id: union([string, number]);
}

// Discriminated union of literal strings — this is the most common pattern
body: {
  type: union([literal("select"), literal("list")]);
}
// → type: 'select' | 'list'

// Mixed types
body: {
  value: optional(union([string, number, boolean, unknown]));
}
```

#### `enum_(obj)` — Enum from a `const` object's values

Pass an `as const` object. The resulting type is a union of its **values** (not keys):

```typescript
// Define the enum object (typically in a domain/enum/ file)
const EnvironmentVariableScope = {
  APPLICATION: "application",
  SERVICE: "service",
  WORKER: "worker",
} as const;

// Use in schema — type becomes 'application' | 'service' | 'worker'
body: {
  scope: enum_(EnvironmentVariableScope);
}
```

This pattern is used throughout the codebase. The convention is to co-export a type alias:

```typescript
export const MyEnum = { A: "a", B: "b" } as const;
export type MyEnum = (typeof MyEnum)[keyof typeof MyEnum]; // 'a' | 'b'
```

#### `type(fn)` — Custom/complex type constructor

For advanced cases where you need to reference a complex schema type that doesn't fit the other primitives. Rarely needed in practice.

#### Combining primitives — real-world examples

```typescript
// Compliance feature config options
const FeatureConfigOptionsSchema = {
  type: union([literal("select"), literal("list")]),
  options: optional(array({ value: string, label: string })),
  listEntryTypes: optional(array(union([literal("cidr"), literal("dns")]))),
  defaultValue: optional(string),
};

// Environment variable with component metadata
const EnvironmentVariableSchema = {
  key: string,
  value: string,
  required: boolean,
  hasValue: boolean,
  isDeleted: optional(boolean),
  source: enum_(EnvironmentVariableScope),
  scopeId: optional(string),
  component: optional({
    type: enum_(EnvironmentVariableComponentType),
    property: enum_(EnvironmentVariableComponentProperty),
    target: optional(string),
    path: optional(string),
  }),
};

// Integration config with dynamic shape
const IntegrationConfigSchema = {
  type: enum_(IntegrationType),
  config: record(string, unknown),
};
```

## Common Patterns

### Creating a New API Feature

```bash
# 1. Add router to existing service
forklaunch init router user-profile --path ./src/modules/platform-management

# 2. Implement the RCSIDES stack:
# - Routes: Define HTTP endpoints
# - Controllers: Handle requests
# - Services: Business logic
# - Interfaces: Type definitions
# - Data: Data transfer objects
# - Entities: Database models
# - Seeders: Test data
```

### Adding a Background Worker

```bash
# 1. Create worker
forklaunch init worker email-worker --path ./src/modules --type bullmq

# 2. Add job processing routers
forklaunch init router send-email --path ./src/modules/email-worker
forklaunch init router process-bounce --path ./src/modules/email-worker

# 3. Implement job handlers in controllers
```

### Sharing Code Across Services

```bash
# 1. Create shared library
forklaunch init library shared-types

# 2. Export types/utilities from library
# 3. Import in services: import { Type } from '@modules/shared-types'
```

### Migrating from SQLite to PostgreSQL

```bash
# 1. Commit current state
git add . && git commit -m "Before database migration"

# 2. Change database
forklaunch change service my-service --database postgresql

# 3. Update environment variables
# 4. Run migrations
pnpm migration:up

# 5. Test thoroughly
pnpm test
```

## When Claude Code Should Use This Skill

1. **User wants to add a new service/worker/library**: Use `forklaunch init` commands
2. **User wants to modify project configuration**: Use `forklaunch change` commands with `--dry-run` first
3. **User mentions Forklaunch patterns**: Apply the best practices from this skill
4. **Creating new files in a Forklaunch project**: Follow the structure conventions
5. **User asks about manifest**: Reference manifest structure and CLI commands
6. **User needs to add infrastructure**: Guide them through adding resources

## Important Notes

Non-interactive / scripting checklist (the CLI's non-TTY handling is inconsistent — verified per command):

- `init` / `change`: supply EVERY required flag or the CLI hangs FOREVER in a prompt-redraw loop (no TTY detection).
- `change router`: `--confirm` is mandatory even with `--dryrun` (else `Error: IO error: not a terminal`).
- `delete *`: no skip flag exists — pipe `y` to stdin.
- `deploy create`: pass `--node-env` or it prompts and dies.
- `release create`: pass `--local` or `--git`, plus `-y`.
- Version gate: a manifest `cli_version` mismatch prompts; non-TTY shows a bare `Error: EOF`.
- Expired login: platform commands silently open a browser device-auth flow and hang headless — check `forklaunch whoami` first.

- ALWAYS use `--dry-run` before applying changes to preview effects
- NEVER manually edit `.forklaunch/manifest.toml` - use CLI commands
- Follow the established project structure conventions
- Use dependency injection via registrations.ts
- Maintain consistent naming conventions
- Test after every change operation
- Commit before and after making structural changes

## Known Scaffold Bugs & Workarounds (verified against CLI v1.2.6, July 2026)

Fixed in v1.2.6 (only relevant on older scaffolds):

- **Duplicate `@mikro-orm/core`** (7.0.11 + 7.0.15 transitive) broke fresh builds on v1.2.3 scaffolds. Fix: `pnpm.overrides` `"@mikro-orm/core": "7.0.11"` + reinstall. v1.2.6 scaffolds build clean.
- **Client-SDK compliance namespace:** v1.2.3 generated `config.iam.core.compliance`; correct is `config.iam.compliance`. Fixed in v1.2.6.
- **`delete router` partial-delete corruption**: FLAKY in v1.2.6 — sometimes deletes cleanly, sometimes fails "Failed to delete from server.ts" mid-way and leaves dangling references in up to 9 files (server.ts, sdk.ts, registrations.ts, index files, seed data, test-utils), breaking the build. After any router delete, grep the service for the router name and repair leftovers before building.

Still present in v1.3.3 — apply these workarounds:

- **`openapi export` / `release create` crashes or hangs for services with a DI-resolved `ExpressApplicationOptions`** (e.g. `iam-better-auth`, which needs it to merge in BetterAuth's async OpenAPI content) — root-caused in v1.3.3: the CLI sets `FORKLAUNCH_MODE=1` on the child process to mean "generate the spec and exit, don't boot for real," but the installed `@forklaunch/core`/`@forklaunch/express` packages only recognize `FORKLAUNCH_MODE === "openapi"` for that shortcut (both the DI singleton-stubbing in `resolveInstance` and the write-spec-and-exit branch in `Application.listen()`). Because of the mismatch the shortcut never engages, so the service boots as a real live server instead — including starting a real MCP tool-server that hangs indefinitely, and resolving a real Orm/BetterAuth stack that needs a live DB and secrets. App-side fix, add to the top of `server.ts` before any `ci.resolve(...)` call:
  ```typescript
  if (process.env.FORKLAUNCH_MODE === '1') {
    process.env.FORKLAUNCH_MODE = 'openapi';
  }
  ```
  Additionally, resolving `ExpressApplicationOptions` through DI in genuine `openapi` mode hits a *second* bug — `resolveInstance` stubs it with a no-op Proxy whose `Symbol.toPrimitive` coerces to `""`, and `contentParse` passes that straight into `express.json()`, so body-parser's strict `limit` validation throws `option limit "" is invalid` at Application-construction time (before `.listen()` is ever reached). Skip DI for that one token in openapi mode instead of resolving it:
  ```typescript
  const app = forklaunchExpress(
    schemaValidator,
    openTelemetryCollector,
    process.env.FORKLAUNCH_MODE === 'openapi'
      ? {}
      : await ci.resolve(tokens.ExpressApplicationOptions)
  );
  ```
- **`init` requires a platform login in v1.2.6** — even for purely local scaffolding, `init application` fails with "No token found" when logged out. Run `forklaunch login` first (CI needs a token).
- **iam `.env.local` template omits `JWKS_PUBLIC_KEY_URL`** — the iam service refuses to boot until you add it (e.g. `JWKS_PUBLIC_KEY_URL=http://localhost:<iam-port>/api/auth/jwks`).
- **Generated seeders are not idempotent** — re-running `pnpm seed` on an already-seeded DB fails with unique-constraint violations; seed only fresh databases (or clear first).
- **`compliance audit -e` platform upload has broken auth** — it hangs on a browser device flow or reports "No token found" even while `release`/`config` work with the same session. Local audit (no `-e`) is unaffected.
- **One platform app links ONE local app** — `integrate` refuses a second local app ("already integrated with another local app"); there is no CLI unlink and no CLI command to create a platform app (dashboard-only).
- **`deploy create` can drop into a real interactive prompt that no flag or piped input can skip.** If required env vars (e.g. `ENCRYPTION_KEY`) aren't already stored for the target environment, it writes a template file to a deterministic path (`/var/folders/.../forklaunch-env-<env>-<region>.env` on macOS) and blocks waiting for an actual keypress on a real TTY — piping `\n` via stdin fails with `Error: IO error: not a terminal` because it checks for a genuine terminal, not just readable input. The file is regenerated from scratch on every invocation (edits made before starting a new run are wiped), so there is no way to pre-fill it. If running non-interactively, ask the user to run the command themselves in a real terminal, or use the dashboard's environment-variables "Save & Deploy" flow instead. Note: `FORKLAUNCH_MODE` can show up in this template as a variable that "needs configuration" — this is a false positive from the variable scanner picking up `process.env.FORKLAUNCH_MODE` references in generated code; leave it as `NONE`/unset, since a real deployed service must never have it set (setting it to `openapi` makes the live server write a spec file and exit instead of serving traffic).

- **"User Supplied" env vars permanently override "Platform Injected" ones — never hand-supply a placeholder for an infra-derived var, on the CLI or the dashboard.** Both the CLI's env-var template file (from the interactive prompt above) and the dashboard's Manage → Environment Variables panel write to the same underlying config store, and that store treats anything you set as authoritative forever — it is never overwritten by the real Pulumi-provisioned value, even after the resource exists and reports healthy. This bites hardest on vars that only make sense once real infra exists: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `PGSSLMODE`, `REDIS_URL`, `CORS_ORIGINS`, `NODE_ENV`, `JWKS_PUBLIC_KEY_URL`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `BETTER_AUTH_URL`. Typing a placeholder for one of these (e.g. `DB_HOST=placeholder`) unblocks whichever gate is asking for it, but Pulumi will go on to provision the real RDS/ElastiCache/ALB endpoints successfully (confirm under the app's Resources page, status "Running") while the ECS task keeps launching with the literal placeholder string — the service crash-loops forever (0/1 replicas, "Degraded") with zero logs ever reaching the OTel/Loki pipeline, since it dies before the app can log anything. Verified against a healthy sibling app: once fully deployed, all such vars should show as "Platform Injected" with real masked values and zero "User Supplied" entries for them — that's the target state, regardless of which tool you deployed with. Fix: in Manage → Environment Variables, delete the placeholder entries for the infra-derived keys above (they move to an "Unset" bucket, which is expected and fine pre-deploy) and redeploy; a second deploy against existing infra only updates the ECS task definition and finishes in a couple of minutes rather than the ~10 the first one takes. Keep as genuine "User Supplied" only the vars with no platform-managed equivalent: app secrets (`ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`), anything with no default in code, and `FORKLAUNCH_MODE=NONE` (see the false-positive note above — never anything else). Optional integrations with a safe code fallback (e.g. `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` behind `?? ''`) still need *some* non-empty value to pass a "missing vars" gate even though the app treats them as disabled when unset — an obvious placeholder string is fine there since the app never uses it unless the feature is actually enabled.

- **Generated `mikro-orm.config.ts` derives `ssl` from `NODE_ENV` instead of the platform's injected `DB_SSL`/`PGSSLMODE`, breaking real deploys made with `--node-env development`** (verified on a real deploy, CLI v1.3.3). The scaffold ships `driverOptions: { ssl: NODE_ENV !== 'development' }` — so `ssl` is only `false` when `NODE_ENV` is literally `'development'`, `true` for anything else including `production`. That's fine if you deploy with `--node-env production`, but the CLI's own `deploy create` example (`--node-env development`) sets `NODE_ENV=development` on a real ECS task talking to a real RDS instance that requires SSL, and the connection fails: `DriverException: no pg_hba.conf entry for host "...", user "...", no encryption`. This surfaces specifically on better-auth's JWT plugin (`/api/auth/jwks`) because MikroORM only opens its connection (and runs the one-time `ensureDatabase` check) lazily on the first real query — in this scaffold that's whichever request touches the DB first, not app boot, so `/health` and the boot logs look clean while auth endpoints 500. Fix in `src/modules/<iam|billing>/mikro-orm.config.ts`, keyed off the platform's real value instead of the environment name:
  ```typescript
  driverOptions: {
    ssl: process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: process.env.PGSSLMODE !== 'no-verify' }
      : validConfigInjector.resolve(tokens.NODE_ENV) !== 'development'
  }
  ```
  A redeploy after this fix (same infra, new release) resolves in ~3 minutes vs. the ~10 for the first deploy.
- **`forklaunch environment validate` misses `IAM_URL` as a required var for billing** — the scanner's Application/Service-Level Variables report never lists `IAM_URL`, yet billing throws `Validation failed: Path: IAM_URL Message: Required` at boot without it (confirmed both locally and on a real deploy, where the platform injects it correctly once `integrate`/`release` have run — it's just invisible to `environment validate`'s static scan). Don't treat a clean `environment validate` as proof the service will actually boot; also check the module's `registrations.ts` `environmentConfig` chain, or just boot it once and read the crash.
- **When a deployed service shows 0 replicas/"Degraded" with no logs, check the dashboard's CloudWatch log source before assuming you need AWS console access.** Dashboard → Monitoring → Logs defaults to a "Live (OTel)" source, which is silent for any crash that happens before the app's own OpenTelemetry collector initializes (e.g. a config-validation failure on boot) — that silence looks identical to "still starting." Switch the log source dropdown from "Live (OTel)" to "CloudWatch" instead: it shows the container's raw stdout/stderr, including the actual stack trace (e.g. `_ConfigInjector.validateConfigSingletons` failures, `Expected number, received nan` on a bad `DB_PORT`, `ELIFECYCLE ... exit code 1`) with no AWS console access required.

- **Empty secrets in generated `.env.local` / `.env.test`** (`ENCRYPTION_KEY=`, `HMAC_SECRET_KEY=`, `BETTER_AUTH_SECRET=`): `pnpm database:setup` fails with `MissingEncryptionKeyError` and tests fail env validation until filled. Generate values before first run: `openssl rand -base64 32` for ENCRYPTION_KEY, `openssl rand -hex 32` for the others. (`forklaunch environment sync` adds missing keys but only with blank values.)
- **iam seeder FK violation** (`account_user_id_foreign`): the generated `persistence/seeders/` omits `user.seeder.ts` even though `seed.data.ts` defines the user, and `DatabaseSeeder` runs seeders via `Object.values(namespace)` which enumerates ALPHABETICALLY (Account before User). Fix: add a `UserSeeder` (mirror `account.seeder.ts`) and replace `Object.values(seeders)` in `persistence/seeder.ts` with an explicit FK-ordered array `[UserSeeder, AccountSeeder, SessionSeeder, VerificationSeeder]`.
- **`pnpm lint` cleanliness depends on module mix** — iam+billing-only apps lint clean, but generated worker/service templates (kafka workers etc.) still ship unused-var errors.
- **`pnpm test` cannot run green out of the box** for DB-backed modules. Three fixable layers: fill `.env.test` (as above); change `ssl: NODE_ENV !== 'development'` to `=== 'production'` in each `mikro-orm.config.ts`; fix `migrationsPath` in `__test__/test-utils.ts` from `'../migrations'` to `'../migrations-postgresql'`. A fourth layer (the harness cannot import `.ts` migration files at runtime) has no app-side fix — treat DB-harness suites as broken and verify endpoints via live HTTP instead. Pure unit tests (no DB) work fine.
- **`migrate:down` never works on the initial migration**: generated migrations ship without a `down()` implementation ("This migration cannot be reverted").
- **Dockerfile pnpm drift**: `RUN npm install -g pnpm` (unpinned) pulls pnpm 11, whose default `minimumReleaseAge` policy rejects lockfile entries published recently. This breaks BOTH local `docker compose build` AND real platform deploys — the same error (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`) shows up in AWS CodeBuild logs and fails `forklaunch deploy create` after all the infrastructure has already been provisioned. Fix: pin the Dockerfile to the host's version, e.g. `RUN npm install -g pnpm@10.12.1`, before releasing/deploying.
- **`change worker --type` is destructive — avoid it**: it rewrites code but does NOT update the manifest (variant/resources keep the old type), and it silently DELETES the `minio:` service from docker-compose while `minio-init`/`tempo` still depend on it, leaving an invalid compose project that `sync all` cannot heal. Prefer deleting and re-creating the worker with the new type; if you must convert, restore the minio block and fix the manifest by hand afterwards.
- **`change service --infrastructure redis` also drops the `minio:` compose service** — same failure mode as `change worker --type` above, just triggered by a different command. After running it, check `docker compose config --quiet` before `docker compose up`; if it errors with `service "thanos-sidecar" depends on undefined service "minio"`, the `minio:` block needs to be restored by hand (copy it from another scaffolded app's `docker-compose.yaml`, or reconstruct: `image: minio/minio`, ports `9000:9000`/`9001:9001`, env `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` both `minioadmin`, healthcheck `mc ready local`).
- **`change service --infrastructure redis` wires a `TtlCache` factory that doesn't compile** — it adds a `TtlCache` registration to `registrations.ts` whose factory destructures `{ REDIS_URL, OtelCollector, ENCRYPTION_KEY }` and calls `new FieldEncryptor(ENCRYPTION_KEY)`, but neither `ENCRYPTION_KEY` (in the `environmentConfig` chain) nor the `FieldEncryptor` import (`from '@forklaunch/core/persistence'`) get added. Fails with "Unable to resolve dependency ENCRYPTION_KEY" at runtime. Add both manually after running the command.
- **Service/worker conversions (`--to worker` / `--to service`) strand compose entries** of the old type; grep docker-compose for the module name after converting (and after deleting a converted module).
- **`eject` is unusable** (panics or misparses every path form; error path exits 0). Eject manually if needed.
- **Generated kafka-init script** uses `$DESC` unescaped, so every compose command prints `The "DESC" variable is not set` warnings (cosmetic; should be `$$DESC`).
- **`forklaunch init service` doesn't wire `ENCRYPTION_KEY` for a new service, locally or at deploy time** — even though it correctly auto-detects sibling `iam`/`billing` modules and wires `IAM_URL`/`BILLING_URL`/`HMAC_SECRET_KEY` (shared, app-level values) into the new service's `registrations.ts` and `docker-compose.yaml`. `ENCRYPTION_KEY` is left out of the new service's `docker-compose.yaml` block entirely (fails with `MissingEncryptionKeyError` on `pnpm migrate:create`/boot) and out of its `.env.local`. The same gap exists on a real deploy: the dashboard's Manage → Environment Variables panel shows the new service with `ENCRYPTION_KEY` under "User Supplied, required, missing" and it deploys with 0 replicas / "Degraded" until you generate a value (`openssl rand -base64 32`) and either add it to `docker-compose.yaml` (local) or `forklaunch config push` it under a `# <service> (<service-id>)` section (deployed). It does not need to match other services' keys — it's only used to encrypt that service's own compliance-tagged fields at rest.
- **Billing's generated `src/modules/billing/surfacing.ts` has two bugs that break `requireActiveSubscription`/`requiredFeatures` out of the box when scaffolded alongside `iam-better-auth`** (verified on a real deploy, CLI v1.3.3, adding a third service to an app with existing iam+billing modules): (1) `createSurfaceSubscription`/`createSurfaceFeatures` read the JWT payload's org claim as `payload.organizationId`, but IAM's own generated `src/modules/iam/auth.ts` (`definePayload`) actually issues it as `activeOrganizationId` — the claim is always `undefined`, so the surfacing function throws `Error: organizationId is required in JWT payload`, an uncaught 500 on every request gated by `requireActiveSubscription`. (2) The same two functions sign the wrong HMAC path for their internal calls — they sign `` `/${organizationId}/subscription` `` and `` `/${productId}/plan` ``, but the actual routes (registered on `subscriptionRouter`/`planRouter`) are `/organization/:id` and `/:id`, so the correct route-relative paths are `` `/organization/${organizationId}` `` and `` `/${productId}` ``. A wrong path fails HMAC verification on the receiving service with `Invalid Authorization signature.` even though the request itself is legitimate. Fix both in `surfacing.ts`: accept `payload.activeOrganizationId ?? payload.organizationId`, and correct the two signed paths.
- **`@forklaunch/implementation-billing-base@1.0.26`'s `getOrganizationSubscription`/`getUserSubscription` hardcode the wrong case for `partyType` in their DB query** — they filter with the literal strings `"ORGANIZATION"`/`"USER"` (the `PartyEnum` object *keys*), but the `subscription.party_type` column only ever stores the enum *values* (`'organization'`/`'user'`, per the DB check constraint and everywhere else `PartyEnum` is used to persist a row). Any real subscription lookup by party therefore always returns `NotFoundError: Subscription not found`, even for a row that genuinely exists and matches — confirmed by inserting a subscription directly and still getting a 404. This is a bug in the vendored package itself, not generated app code. Fix with `pnpm patch @forklaunch/implementation-billing-base@1.0.26`, lowercasing both `partyType: "USER"` → `"user"` and `partyType: "ORGANIZATION"` → `"organization"` in both `lib/services/index.js` and `index.mjs`.
- **`billing-stripe`'s `getOrganizationSubscription`/`getUserSubscription` always make a live call to the real Stripe API** (`stripeClient.subscriptions.retrieve(...)`) to enrich `stripeFields`, even on a plain read of already-persisted local data — so `requireActiveSubscription`/`requiredFeatures` (and the `surfacing.ts` helpers above) cannot work in ANY environment without a real, valid `STRIPE_API_KEY`, including local dev with a placeholder key (`Error: Invalid API Key provided: replace-***-key`). This contradicts the surrounding cache-first design (`BillingCacheService`'s own doc comment says subscription data should come from "billing cache (populated by webhook events) or via SDK") — there is currently no way to read subscription status without hitting Stripe live, and no workaround short of patching this method to skip the live retrieve.
- **`iam-better-auth`'s `organization()` plugin config ships `dynamicAccessControl: { enabled: true }` with zero seeded permissions**, which makes a freshly-created organization unusable for any role other than its creator's default `owner` role via the API alone: the sole owner can't invite another member (`POST /api/auth/organization/invite-member` → 403 `YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION`, since dynamicAccessControl checks a per-role `organization_role` permission table that's empty for a fresh org), and can't self-demote (`update-member-role` → 400 `YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER`, since they're the only member). There is no exposed endpoint to seed default org-role permissions. If you need a non-owner-role test user, the only way is to write the `member` row's `role` column directly in the iam database — only possible with DB access (e.g. locally via `docker exec ... psql`), not available against a real deployed RDS instance.

## Related Documentation

Task-level gotchas found while implementing real features on top of a scaffold (not CLI-invocation issues) now live in the skill that owns that topic, not here:

- Editing generated `.env.local`/`.env.test` safely, and the `migrate:down`-on-initial-migration caveat → `/common-tasks`
- `JWKS_PUBLIC_KEY_URL`/`IAM_URL`/`HMAC_SECRET_KEY` env requirements, HMAC router-relative-path signing, cross-service RBAC wiring (`createAuthOptions`/`createSurfaceRoles`), seeder FK ordering and idempotency → `/backend-patterns`
- Route registration order (specific paths before `/:id`), `schemaValidator.schemify` vs `.compile`, non-JSON body content-type collapse → `/framework`
- Misconfigured `REDIS_URL` hangs instead of failing fast → `/infrastructure-and-utilities`
- Killing a local dev server by port, not by `pkill -f` pattern → `/development-guidelines`

For more information, refer to:

- ForkLaunch CLI Reference: `/docs/cli.md`
- Adding Projects Guide: `/docs/adding-projects.md`
- Changing Projects Guide: `/docs/changing-projects.md`
- Framework Reference: `/docs/framework.md`
