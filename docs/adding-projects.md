---
title: Adding Projects
category: Guides
description: Learn how to add projects to your ForkLaunch application.
---

## Overview

The cornerstone of `ForkLaunch` is its modular project system. This approach:
- Keeps code organized and maintainable
- Reduces cognitive load
- Provides flexibility for infrastructure decisions

## Understanding Artifacts and Projects

### What Are Artifacts?

**Artifacts** are configuration files that ForkLaunch maintains to keep your application organized. They track which projects exist, how they're configured, and how they integrate with the application.

### The Five Artifacts

| Artifact | Location | Purpose | Updated By |
|----------|----------|---------|------------|
| **Manifest** | `.forklaunch/manifest.toml` | Project registry and metadata | All operations |
| **Docker Compose** | `docker-compose.yaml` | Container service definitions | Services, Workers |
| **Runtime Workspace** | `pnpm-workspace.yaml` or `package.json` | Package manager workspace | All projects |
| **Universal SDK** | `modules/universal-sdk/` | Auto-generated API clients | Services only |
| **TypeScript Config** | `modules/tsconfig.json` | TypeScript project references | Services, Workers, Libraries |

### How Artifacts Change When Adding Projects

When you add a project, ForkLaunch updates the relevant artifacts:

#### Adding a Service
- ✅ **Manifest**: Adds service entry with metadata
- ✅ **Docker Compose**: Adds service container definition
- ✅ **Runtime Workspace**: Adds service to workspace
- ✅ **Universal SDK**: Generates API client code
- ✅ **TypeScript Config**: Adds project reference

#### Adding a Worker
- ✅ **Manifest**: Adds worker entry with metadata
- ✅ **Docker Compose**: Adds worker container definition
- ✅ **Runtime Workspace**: Adds worker to workspace
- ❌ **Universal SDK**: Not updated (workers don't expose APIs)
- ✅ **TypeScript Config**: Adds project reference

#### Adding a Library
- ✅ **Manifest**: Adds library entry with metadata
- ❌ **Docker Compose**: Not updated (libraries aren't containers)
- ✅ **Runtime Workspace**: Adds library to workspace
- ❌ **Universal SDK**: Not updated (libraries don't expose APIs)
- ✅ **TypeScript Config**: Adds project reference

### How Artifacts Change with Other Operations

#### Changing a Project (`forklaunch change`)
- ✅ **Manifest**: Updates project metadata
- ✅ **Docker Compose**: Updates container configuration (if applicable)
- ✅ **Runtime Workspace**: Updates dependencies
- ✅ **Universal SDK**: Regenerates client (services only)
- ✅ **Project Files**: Updates configuration files in project directory

#### Deleting a Project (`forklaunch delete`)
- ✅ **Manifest**: Removes project entry
- ✅ **Docker Compose**: Removes container definition
- ✅ **Runtime Workspace**: Removes from workspace
- ✅ **Universal SDK**: Removes client code (services only)
- ✅ **TypeScript Config**: Removes project reference
- ⚠️ **Project Directory**: Not deleted (you must remove manually)

#### Syncing a Project (`forklaunch sync`)
- ✅ **Manifest**: Adds project entry (if missing)
- ✅ **Docker Compose**: Adds container definition (services/workers only)
- ✅ **Runtime Workspace**: Adds to workspace
- ✅ **Universal SDK**: Generates client code (services only)
- ✅ **TypeScript Config**: Adds project reference
- ❌ **Project Files**: Not created (assumes they already exist)

## Available Projects

### Core Projects
- **Modules**: Pre-built services/workers/libraries that help you bootstrap your application
- **Services**: Host HTTP APIs and web applications
- **Workers**: Run asynchronous tasks using event-driven architecture
- **Libraries**: Share common code and business logic

### Project Building Blocks
- **Routers**: Add RCSIDES stack to existing services/workers
  - Routes
  - Controllers
  - Services
  - Interfaces
  - Mappers
  - Entities
  - Seeders

### Coming Soon
- **Agents**: Optimized for AI-driven workflows

## Feature Requests

Have an idea for a new project type? We welcome feature requests! Please submit them to our [GitHub Issues](https://github.com/forklaunch/forklaunch-js/issues).

## Next Steps

Learn more about each project type:
- [Modules](/docs/adding-projects/modules.md)
- [Services](/docs/adding-projects/services.md)
- [Workers](/docs/adding-projects/workers.md)
- [Libraries](/docs/adding-projects/libraries.md)
- [Routers](/docs/adding-projects/routers.md)
