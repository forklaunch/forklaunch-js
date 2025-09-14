---
title: Framework - Config Injector
category: References
description: Reference for using ConfigInjector in ForkLaunch.
---

## Overview

The `ConfigInjector` from `@forklaunch/core` provides a type-safe dependency injection system designed around the `Inversion of Control` principle. It offers minimal magic while ensuring proper dependency construction and lifecycle management.

The system follows a clear structure:
1. **Define dependencies** and their return types using a schema validator
2. **Register dependencies** with lifetime management (Singleton, Constructed, Transient)
3. **Resolve dependencies** with automatic type inference and validation
4. **Manage scopes** for request-scoped dependencies

## Basic Usage

```typescript
import { createConfigInjector } from '@forklaunch/core/services';
import { createZodValidator } from '@forklaunch/validator/zod';
import { z } from 'zod';

// Define your dependencies and their types using schema validator
const schemaValidator = createZodValidator();

const configShapes = {
    databaseClient: z.instanceof(DatabaseClient),
    logger: z.instanceof(LoggerService),
    apiKey: z.string()
} as const;

// Create the injector with definitions
const configInjector = createConfigInjector(
    schemaValidator,
    {
        databaseClient: {
            lifetime: 'transient',
            factory: ({ logger }) => new DatabaseClient(logger)
        },
        logger: {
            lifetime: 'scoped',
            factory: () => new LoggerService()
        },
        apiKey: {
            lifetime: 'singleton',
            value: process.env.API_KEY
        }
    }
);
```

The factory method provides access to other dependencies and context:

```typescript
// Factory signature with dependency injection
factory: (dependencies: Partial<ConfigShapes>, context?: Record<string, unknown>) => ConfigShapes[K]
```

This enables:
1. **Dependency injection** - Access other registered dependencies
2. **Circular dependency resolution** - Create callbacks for complex dependencies
3. **Context passing** - Include external data in construction

## Lifetime Management

The ConfigInjector supports three lifetime types:

- **`singleton`**: Created once and reused across all scopes
- **`scoped`**: Created once per scope (typically per request)
- **`transient`**: Created new for each resolution

```typescript
type Lifetime = 'singleton' | 'scoped' | 'transient';

// Example with different lifetimes
const configInjector = createConfigInjector(schemaValidator, {
  // Singleton - shared across all requests
  databaseConnection: {
    lifetime: 'singleton',
    value: new DatabaseConnection()
  },
  
  // Scoped - per request/scope
  userContext: {
    lifetime: 'scoped',
    factory: ({ requestId }) => new UserContext(requestId)
  },
  
  // Transient - new instance each time
  validator: {
    lifetime: 'transient',
    factory: () => new Validator()
  }
});
```

## Dependency Resolution

Dependencies are resolved with full type safety and autocomplete support:

```typescript
// Resolve dependencies with type inference
const logger = configInjector.resolve('logger');        // LoggerService
const db = configInjector.resolve('databaseClient');    // DatabaseClient
const apiKey = configInjector.resolve('apiKey');        // string
```

## Scoping

The ConfigInjector supports request-scoped dependencies:

```typescript
// Create a new scope (typically per HTTP request)
const scope = configInjector.createScope();

// Resolve scoped dependencies
const userContext = scope.resolve('userContext');  // New instance per scope
const logger = scope.resolve('logger');            // Scoped instance

// Clean up scope when request completes
scope.dispose();
```

## Validation

The ConfigInjector includes built-in schema validation:

```typescript
// Validate configuration on startup
try {
  configInjector.validateConfig();
  console.log('Configuration is valid');
} catch (error) {
  console.error('Configuration validation failed:', error);
}

// Safe validation that returns a result
const validationResult = configInjector.safeValidateConfig();
if (!validationResult.success) {
  console.error('Validation errors:', validationResult.errors);
}
```

## Circular Dependency Detection

The ConfigInjector automatically detects and prevents circular dependencies:

```typescript
// This will throw an error if serviceA depends on serviceB which depends on serviceA
const serviceA = configInjector.resolve('serviceA');
```

## Context Injection

You can pass context to dependency resolution, if during construction, you need outside information:

```typescript
const service = configInjector.resolve('service', { 
    requestId: '123',
    userId: '456' 
});
```

## Best Practices

1. Define dependencies at the highest appropriate level
2. Use singletons for stateless services
3. Use scoped lifetime for request-scoped dependencies
4. Use transient lifetime sparingly
5. Always validate your configuration during startup
6. Dispose of scopes when they're no longer needed

## Type Safety

The ConfigInjector is fully typed and will provide compile-time type checking for:

- Dependency definitions
- Resolution types
- Factory arguments
- Validation results
