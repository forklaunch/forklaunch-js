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

### RCSIDES Architecture Pattern

**RCSIDES** is ForkLaunch's layered architecture pattern for organizing service and router code. It stands for:

| Layer | Purpose | Location |
|-------|---------|---------|
| **R** - Routes | Define HTTP endpoints and map URLs to controllers | `api/routes/` |
| **C** - Controllers | Handle HTTP requests/responses, validate input, delegate to services | `api/controllers/` |
| **S** - Services | Implement business logic and orchestrate operations | `services/` |
| **I** - Interfaces | Define TypeScript contracts for service methods | `domain/interfaces/` |
| **D** - Domain | Validation schemas and TypeScript types/DTOs | `domain/schemas/`, `domain/types/` |
| **E** - Entities | Database models (MikroORM entities) that map to tables | `persistence/entities/` |
| **S** - Seeders | Initial/test data for populating the database | `persistence/seeders/` |

**How It Works:**

```
HTTP Request → Route → Controller → Service → Entity (Database)
                      ↓
                  Domain (Validation)
                      ↓
                  Interface (Contract)
```

**Example Flow:**
1. User makes `POST /api/users` request (Route)
2. Controller receives request, validates with Domain schema
3. Controller calls Service method (defined by Interface)
4. Service uses Entity to save to database
5. Service returns result, Controller formats response
6. Seeder can populate initial data for development

**Benefits:**
- **Separation of Concerns**: Each layer has a single, clear responsibility
- **Testability**: Easy to mock interfaces and test services independently
- **Maintainability**: Changes in one layer don't cascade to others
- **Type Safety**: TypeScript interfaces ensure contracts are met
- **Validation**: Domain schemas validate data at API boundaries
