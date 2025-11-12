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

