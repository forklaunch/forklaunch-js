# Forklaunch

<div align="center">
    <img src="./assets/logo.svg" alt="ForkLaunch Logo" width="200">
</div>

## Overview

ForkLaunch streamlines the development process by automating boilerplate creation and managing dependencies across services, workers, and libraries. 

The **CLI** handles manifest updates, Docker configuration, and ensures consistent development patterns.

The **framework** defines powerful abstractions that supercharge common development patterns, to get you up and running quickly.

The best part? If you don't like it, you can easily change it.

# The CLI

## Core Commands

### Initialize an Application

```bash
forklaunch init application my-application
```

Creates a new application with:
- Workspace configuration
- Shared core implementation with registered choices
- Selected License
- Application Manifest
- Docker Compose configuration
- Pre-configured ESLint, Prettier, and Husky
- Monitoring library

### Adding Components

#### Add a Service

```bash
forklaunch add service my-service
```

Creates a new microservice with:
- Service boilerplate code, including models, controllers, services, and routes
- Updated manifest
- Docker Compose configuration
- All necessary dependencies

#### Add a Worker

```bash
forklaunch add worker my-worker
```

Creates a background worker with:
- Worker boilerplate code, including models, controllers, services, and routes
- Job processing setup
- Updated manifest and Docker configuration

#### Add a Library

```bash
forklaunch add library my-library
```

Creates a shared library that can be used across services:
- Library structure
- Package configuration
- Automatic dependency linking

#### Add a Router (in workers and services)

```bash
forklaunch add router my-controller
```

The `add router` command is particularly powerful as it:
- Creates a new Controller following MVC patterns
- Automatically wires up routes, in code
- Integrates with existing service or worker
- Generates test files for the new controller

#### Check dependencies

```bash
forklaunch depcheck
```

Checks dependency versions across projects. To define groups of projects that need the same dependencies, look at `.forklaunch/manifest.toml` > `[project_peer_dependencies]`.

# The Framework

## ORM

ForkLaunch works best with `MikroORM` for database management and entity management.

## HTTP Frameworks

ForkLaunch works best with `express` or `hyper-express (uwebsockets)` for HTTP server management.

## Development Tools

### Testing

Automatic testing with Vitest or Jest.

### Definining Configuration

Configuration can be defined via a ConfigInjector class. The behavior can be observed in `mikro-orm.config.ts` and `bootstrapper.ts` files.

Dependencies can have one of three lifetimes:

- `singleton` - A singleton dependency is created once and shared across the application.
- `scoped` - A scoped dependency is created once per scoped session.
- `transient` - A transient dependency is created each time it is requested.

This abstraction is also powerful to validate that environment and expected constant variables are present at runtime.

### Adding API Metadata

When defining APIs, you can add metadata to the API definition in an idiomatic manner. This achieves the following:

- Serves as a typing specification when writing API handlers
- Validates and coerces data to specified types when processed in handlers 
- Used to generate OpenAPI specification
- Used to generate API reference documentation

The general format is defined by the REST method, but generally follows the following format:

```typescript
{
  name: "A Random POST API",
  summary: "My API that works! Probably a nice POST request",
  headers: {
    "x-header-name": string
  },
  params: {
    id: number
  },
  body: {
    message: string,
    nestedObject: {
        anotherNestedObject: {
            sweet: boolean
        },
        justAString: string,
        justANumber: number,
    }
  },
  responses: {
    200: {
        returnMessage: string,
        metadata: {
            items: array(union(string, number, boolean)),
            timestamp: date
        }
    },
    301: union(string, number)
  },
};
```

Auth can also be added to the API definition, but is not required. Supported auth types are:

- `bearer` - Bearer token authentication
- `jwt` - JWT authentication
- `other` - Another auth method. You will need to supply a `decodeToken` callback

When defining this, the smart typing will ask you to provide `permissions` and/or `roles` for the API. You can also supply optional callbacks that hook into the token based auth flow.

## Advanced Configuration

### OpenTelemetry Configuration

By default, ForkLaunch will configure OpenTelemetry to send traces to an OpenTelemetry collector service running in docker. The LGTM stack is pre-configured to receive metrics, logs, and traces, and a pre-configured `grafana` dashboard is available at `http://localhost:3000`.

In order to make adjustments, config and code is located in the `monitoring` directory. Custom metrics can be added to `monitoring/metrics.ts`, and used virtually anywhere in code. Context aware instrumentation will deliver logs, metrics and traces. Supported override ENV variables are:

- `OTEL_EXPORTER_OTLP_ENDPOINT` - The endpoint to send traces to.
- `OTEL_SERVICE_NAME` - The name of the service.

### OpenAPI Configuration and API Reference documentation

Contract aware OpenAPI is generated live when running `pnpm dev`. API references are available at `http://localhost:8000/api/v1/docs`. You have the option of using swagger or scalar. If using scalar (by default), customization options can be passed through additional configuration. Note, the path can be overridden by supplying values for the following ENV variables:

- `VERSION` - The title of the OpenAPI documentation.
- `DOCS_PATH` - The path to the OpenAPI documentation.

Enrichment of the OpenAPI spec can be done inline where contract details are defined.

### Custom License

When initializing a project, the license was specified. The generated license will appear in the root of your project.

More information can be found in [ForkLaunch documentation](https://forklaunch.com/docs).

Happy hacking!
