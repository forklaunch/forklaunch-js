---
title: Creating an Application
category: Guides
description: Learn how to create your first ForkLaunch application.
---

## Generating a new Application

To generate a new application, you can use prompts or flags:

```bash
# Interactive prompts
forklaunch init application

# Or with flags (for scripts/AIs)
forklaunch init application my-app \
  --database postgresql \
  --validator zod \
  --http-framework express \
  --runtime node
```

### What Gets Created: Application Artifacts

When you create an application, ForkLaunch creates **application artifacts** - configuration files that manage your entire application:

| Artifact | Location | Purpose |
|----------|----------|---------|
| **Manifest** | `.forklaunch/manifest.toml` | Stores application metadata, project registry, and configuration |
| **Docker Compose** | `docker-compose.yaml` | Defines monitoring services (Grafana, Prometheus, Loki, Tempo) |
| **Runtime Workspace** | `pnpm-workspace.yaml` or `package.json` | Package manager workspace configuration |
| **Universal SDK** | `modules/universal-sdk/` | Structure for auto-generated API clients (created when services are added) |
| **TypeScript Config** | `modules/tsconfig.json` | TypeScript project references (created when projects are added) |

**Initial Application State:**
- Manifest created with application metadata
- Docker Compose created with monitoring services only
- Runtime workspace created
- Universal SDK structure (empty until services added)
- TypeScript config (created when first project added)

### Projects Within an Application

An **application** is a container that holds **projects** (services, workers, libraries). Projects are independent modules that live in your `src/modules/` or `modules/` directory.

**Application Structure:**
```
my-app/                    ← Application
├── .forklaunch/
│   └── manifest.toml      ← Application artifact
├── docker-compose.yaml     ← Application artifact
└── src/modules/           ← Projects live here
    ├── api-service/        ← Project (Service)
    ├── email-worker/       ← Project (Worker)
    ├── shared-utils/       ← Project (Library)
    ├── pnpm-workspace.yaml    ← Application artifact
```

### Configuration Options

During initialization, you'll be prompted to configure your application. All choices can be modified later:

| Component | Options | Description | How to Change |
| :-------- | :------- | :------------ | :------------- |
| _HTTP Framework_ | `express`, `hyper-express` | HTTP framework for your application | Edit `core/registrations.ts` framework import path |
| _Validator_ | `zod`, `typebox` | Schema validation and coercion library | Edit `core/registrations.ts` validator import path |
| _Runtime_ | `node`, `bun` | Application runtime | Update package scripts and workspace config |
| _Test Runner_ | `vitest`, `jest` | Test execution framework | Update test scripts in package.json files |
| _Database_ | `postgresql`, `mongodb` | Database with MikroORM integration | Update SqlBaseEntity exports and extensions |
| _License_ | `apgl`, `gpl`, `lgpl`, `mozilla`, `apache`, `mit`, `boost`, `unlicense`, `none` | Project license | Edit LICENSE file |
| _Preconfigured Modules_ | `billing`, `iam` | Optional base services (see [Preconfigured Modules](/docs/preconfigured-modules)) | Remove service folder and update manifest.toml |

### Important Notes

- Requests for more choices are welcome! Please create a discussion on the [ForkLaunch GitHub repository](https://github.com/
forklaunch/forklaunch-js).
- Use `forklaunch change` to make safe changes. If manually editing, update `./forklaunch/manifest.toml` after making changes to help ForkLaunch track metadata
- MikroORM provides both repository patterns and raw SQL access
- Preconfigured services use opaque business logic by default
  - Use `forklaunch eject` to customize logic
  - Ejected services may not receive updates

## Project Structure

```bash
.
│
├── docker-compose.yaml
│   # Services: tempo, loki, prometheus, grafana, otel-collector
│   # LGTM Stack (Loki, Grafana, Tempo, Mimir) for observability
│
└── src/modules/ #modules/
    │
    ├── package.json # Root workspace config
    ├── pnpm-workspace.yaml # Monorepo workspace definition for node projects
    ├── tsconfig.json # TypeScript root config
    ├── tsconfig.base.json (Shared TS config)
    ├── vitest.config.ts (Root test config)
    ├── eslint.config.mjs (Root linting config)
    ├── LICENSE (MIT License)
    ├── README.md (Project documentation)
    ├── Dockerfile (Container build config)
    │
    ├── assets/
    │   └── logo.svg (ForkLaunch logo)
    │
    ├── patches/
    │   └── @jercle__yargonaut.patch (Dependency patch)
    │
    ├── @dice-roll-node-app/core/
    │   ├── package.json
    │   ├── index.ts (Main entry point)
    │   ├── rbac.ts (Role-Based Access Control)
    │   ├── registrations.ts (Dependency injection registrations)
    │   ├── tsconfig.json
    │   ├── vitest.config.ts
    │   ├── eslint.config.mjs
    │   │
    │   └── persistence/
    │       ├── index.ts
    │       └── sql.base.entity.ts (Base SQL entity)
    │
    │   Purpose: Core library with shared foundational infrastructure
    │   Dependencies: MikroORM, ForkLaunch packages, Express, Zod
    │
    ├── @dice-roll-node-app/monitoring/
    │   ├── package.json
    │   ├── index.ts (Main entry point)
    │   ├── metricsDefinitions.ts (Custom metrics)
    │   ├── otel-collector-config.yaml (OpenTelemetry config)
    │   ├── prometheus.yaml (Prometheus config)
    │   ├── tempo.yaml (Tempo tracing config)
    │   ├── tsconfig.json
    │   ├── vitest.config.ts
    │   ├── eslint.config.mjs
    │   │
    │   └── grafana-provisioning/
    │       ├── dashboards/
    │       │   ├── application-overview.json
    │       │   ├── default.yaml
    │       │   └── red.json
    │       └── datasources/
    │           └── datasources.yaml
    │
    │   Purpose: Monitoring library for metrics, logs, and traces
    │   Dependencies: ForkLaunch core
    │
    └── @dice-roll-node-app/universal-sdk/
        ├── package.json
        ├── index.ts (Main entry point)
        ├── universalSdk.ts (SDK implementation)
        ├── tsconfig.json
        ├── vitest.config.ts
        └── eslint.config.mjs
        │
        Purpose: Universal SDK for shared utilities
        Dependencies: ForkLaunch common & universal-sdk

```

## Next Steps

Congratulations on creating your application! Here are some helpful resources:

- [Adding Projects](/docs/adding-projects.md) - Add services and workers
- [Local Development](/docs/local-development.md) - Run your application locally
- [Framework Reference](/docs/framework.md) - Learn about framework features
- [CLI Reference](/docs/cli.md) - Explore available commands
- [Customizations](/docs/customizations.md) - Customize your application
<!-- - [Deployment](/docs/deployment) - Deploy your application -->

