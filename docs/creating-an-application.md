---
title: Creating an Application
category: Guides
description: Learn how to create your first ForkLaunch application.
---

## Generating a new Application

To generate a new application, run:

```bash
forklaunch init application
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
├── Dockerfile
├── LICENSE
├── README.md
├── assets
│ └── logo.svg # the logo for your application. comes pre-generated with the forklaunch logo. Replace with your own
├── core # the core logic for your application. Think of this as a `common` or `shared` library
│ ├── eslint.config.mjs -> ../eslint.config.mjs # symlinked from parent for consistency
│ ├── index.ts
│ ├── models
│ │ ├── index.ts
│ │ ├── persistence # the common persistence layer for your application, defining base entities
│ │ │ └── base.entity.ts # the base entity file for your application
│ │ └── types # the common types for your application
│ │ └── shapes.ts # useful utility types for data mappers
│ ├── package.json
│ ├── registrations.ts # the common registrations for your application, defining component choices
│ ├── tsconfig.json
│ └── vitest.config.ts -> ../vitest.config.ts # symlinked from parent for consistency
├── docker-compose.yaml
├── eslint.config.mjs # the linting configuration applied across all projects in the application
├── monitoring
│ ├── eslint.config.mjs -> ../eslint.config.mjs # symlinked from parent for consistency
│ ├── grafana-provisioning
│ │ ├── dashboards
│ │ │ ├── application-overview.json # preconfigured application overview dashboard collecting basic correlated metrics, logs, and traces
│ │ │ ├── default.yaml # default grafana provisioning configuration
│ │ │ └── red.json # preconfigured RED dashboard
│ │ └── datasources
│ │ └── datasources.yaml
│ ├── index.ts
│ ├── metricsDefinitions.ts # where you should define your custom metrics
│ ├── otel-collector-config.yaml
│ ├── package.json
│ ├── prometheus.yaml
│ ├── tempo.yaml
│ ├── tsconfig.json
│ └── vitest.config.ts -> ../vitest.config.ts # symlinked from parent for consistency
├── package.json
├── pnpm-workspace.yaml (node runtime only)
├── tsconfig.base.json # the base tsconfig for your application, used across all projects
└── vitest.config.ts # the test runner configuration for your application, used across all projects
```

## Next Steps

Congratulations on creating your application! Here are some helpful resources:

- [Adding Projects](/docs/adding-projects.md) - Add services and workers
- [Local Development](/docs/local-development.md) - Run your application locally
- [Framework Reference](/docs/framework.md) - Learn about framework features
- [CLI Reference](/docs/cli.md) - Explore available commands
- [Customizations](/docs/customizations.md) - Customize your application
<!-- - [Deployment](/docs/deployment) - Deploy your application -->

