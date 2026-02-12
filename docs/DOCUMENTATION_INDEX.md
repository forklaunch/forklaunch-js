---
title: ForkLaunch Documentation Index
description: Complete index of all ForkLaunch framework and CLI documentation
---

# ForkLaunch Documentation Index

This document provides a complete index of all available documentation for the ForkLaunch framework, CLI, and platform.

## Framework Documentation

### Core Modules

#### ✅ Cache Module
**Location**: [`/docs/development/cache.md`](./development/cache.md)

Complete guide to the TTL-based caching system with Redis implementation.

**Covers**:
- `TtlCache` interface and `TtlCacheRecord` type
- `RedisTtlCache` implementation
- Basic operations (put, read, delete, peek)
- Batch operations for performance
- Queue operations (FIFO with Redis lists)
- `createCacheKey` utility for consistent naming
- Common patterns (sessions, rate limiting, job queues)
- Best practices and testing

**Key Imports**:
```typescript
import { createCacheKey, TtlCache, TtlCacheRecord } from '@forklaunch/core/cache';
import { RedisTtlCache } from '@forklaunch/infrastructure-redis';
```

---

#### ✅ Object Store Module
**Location**: [`/docs/development/objectstore.md`](./development/objectstore.md)

Complete guide to the Object Store abstraction for large file storage with S3.

**Covers**:
- `ObjectStore` interface
- `S3ObjectStore` AWS implementation
- Basic operations (put, read, delete)
- Batch operations
- Streaming operations for large files
- `createObjectStoreKey` utility
- Common patterns (user files, versioning, backups)
- Best practices and testing with LocalStack

**Key Imports**:
```typescript
import { createObjectStoreKey, ObjectStore } from '@forklaunch/core/objectstore';
import { S3ObjectStore } from '@forklaunch/infrastructure-s3';
```

---

#### 🔄 WebSocket Module
**Location**: [`/docs/development/websockets.md`](./development/websockets.md) *(In Progress)*

Guide to type-safe WebSocket implementation with schema validation.

**Covers**:
- `ForklaunchWebSocket` and `ForklaunchWebSocketServer`
- Type-safe event handling with `EventSchema`
- Automatic Buffer ↔ Object conversion
- Schema validation (Zod, TypeBox)
- AsyncAPI 3.0 specification generation
- Common patterns (chat, real-time updates)

**Key Imports**:
```typescript
import { ForklaunchWebSocket, ForklaunchWebSocketServer, EventSchema } from '@forklaunch/ws';
```

---

#### 🔄 Testing Module
**Location**: [`/docs/development/testing.md`](./development/testing.md) *(In Progress)*

Comprehensive testing utilities with TestContainers integration.

**Covers**:
- `TestContainerManager` for Docker containers
- `BlueprintTestHarness` for blueprint testing
- `setupTestORM()` and `setupTestEnvironment()`
- Database-specific configurations
- `TEST_TOKENS` for authentication
- Integration testing patterns

**Key Imports**:
```typescript
import { TestContainerManager, BlueprintTestHarness, TEST_TOKENS } from '@forklaunch/testing';
```

---

#### ✅ Authorization Module
**Location**: [`/docs/development/authorization.md`](./development/authorization.md)

Complete guide for IAM and Billing utilities with RBAC and feature flags.

**Covers**:
- IAM utilities (roles, permissions, surfacing)
- Billing utilities (features, subscriptions, cache)
- RBAC implementation
- Feature-based entitlements
- Auth cache and billing cache
- HMAC authentication

**Key Imports**:
```typescript
import {
  PLATFORM_ADMIN_ROLES,
  PERMISSIONS,
  createAuthCacheService,
  createSurfaceRoles
} from '@{your-app-name}/iam/utils';

import {
  FEATURE_FLAGS,
  createBillingCacheService,
  createSurfaceFeatures
} from '@{your-app-name}/billing/utils';
```

---

#### ✅ HTTP Framework
**Location**: [`/docs/development/http.md`](./development/http.md)

HTTP framework guide with Express and Hyper-Express adapters.

**Covers**:
- Route definition patterns
- Schema validation
- Authentication and authorization
- Middleware
- Error handling

---

#### ✅ Validation
**Location**: [`/docs/development/validation.md`](./development/validation.md)

Schema validation with Zod and TypeBox.

**Covers**:
- Schema validators
- Input validation
- Response validation
- Custom validators

---

#### ✅ Error Handling
**Location**: [`/docs/development/error-handling.md`](./development/error-handling.md)

Error handling patterns and best practices.

---

#### ✅ Telemetry
**Location**: [`/docs/development/telemetry.md`](./development/telemetry.md)

OpenTelemetry integration for observability.

**Covers**:
- Metrics collection
- Distributed tracing
- Logging
- Performance monitoring

---

#### ✅ Universal SDK
**Location**: [`/docs/development/universal-sdk.md`](./development/universal-sdk.md)

SDK generation and usage guide.

---

#### ✅ Stripe Plan Sync
**Location**: [`/docs/development/stripe-plan-sync.md`](./development/stripe-plan-sync.md)

Stripe integration and plan synchronization.

---

#### 🔄 Utility Packages
**Location**: [`/docs/development/utilities.md`](./development/utilities.md) *(In Progress)*

Utility functions from @forklaunch/common and other packages.

**Covers**:
- String utilities (camelCase, hashString)
- Object utilities (deepClone, sortObjectKeys)
- Type guards (isRecord, isTrue)
- Mappers module
- Persistence (BaseEntity)
- Environment (loadCascadingEnv)

---

### Infrastructure Implementations

#### ✅ Redis Cache
**Covered in**: [`/docs/development/cache.md`](./development/cache.md)

Production-ready Redis implementation of TtlCache interface.

**Features**:
- Full TTL support
- Queue operations (FIFO)
- Batch operations
- Automatic JSON serialization
- Telemetry integration

---

#### ✅ S3 Object Store
**Covered in**: [`/docs/development/objectstore.md`](./development/objectstore.md)

AWS S3 implementation of ObjectStore interface.

**Features**:
- Automatic bucket creation
- Streaming support
- Batch operations
- Full S3 SDK access

---

## CLI Documentation

### Core Commands

#### ✅ init Command
**Location**: [`/docs/creating-an-application.md`](./creating-an-application.md), [`/docs/adding-projects.md`](./adding-projects.md)

Initialize new applications, services, workers, and libraries.

```bash
forklaunch init application <name>
forklaunch init service <name> --database postgresql
forklaunch init worker <name> --type bullmq
forklaunch init library <name>
```

---

#### ✅ change Command
**Location**: [`/docs/changing-projects.md`](./changing-projects.md)

Modify existing projects.

```bash
forklaunch change application --runtime bun --dry-run
forklaunch change service <name> --database mysql
```

---

#### ✅ delete Command
**Location**: [`/docs/deleting-projects.md`](./deleting-projects.md)

Delete services, workers, and libraries.

```bash
forklaunch delete service <name>
forklaunch delete worker <name>
```

---

#### 🔄 sync Command
**Location**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*

Synchronize artifacts after manifest changes.

```bash
forklaunch sync all
forklaunch sync service <name>
forklaunch sync worker <name>
forklaunch sync library <name>
```

---

#### 🔄 environment Command
**Location**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*

Manage and validate environment variables.

```bash
forklaunch environment validate
forklaunch environment sync
forklaunch env validate  # Short alias
```

---

#### 🔄 openapi Command
**Location**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*

Export OpenAPI specifications.

```bash
forklaunch openapi export --output ./docs/api
```

---

#### 🔄 sdk Command
**Location**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*

SDK generation and configuration.

```bash
forklaunch sdk mode [lean|full]
```

---

#### 🔄 deploy Command
**Location**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*

Deployment management.

```bash
forklaunch deploy create --environment staging --region us-east-1
forklaunch deploy destroy --environment staging
```

---

#### 🔄 release Command
**Location**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*

Release management.

```bash
forklaunch release create --version 1.2.3
```

---

#### 🔄 integrate Command
**Location**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*

Link local application to ForkLaunch platform.

```bash
forklaunch integrate --app <application-id>
```

---

## AI Assistant Integration

### Cursor Rules
**Location**: `/.cursorrules`

Comprehensive AI assistance rules for Cursor editor with:
- Critical import patterns
- 7-layer import organization
- Cache and Object Store patterns
- WebSocket patterns
- Testing patterns with TestContainers
- CLI command reference
- Utility functions reference
- Common mistakes to avoid

### Claude Code Skills
**Location**: `/.claude/skills/`

Full skill system for Claude Code (auto-loads).

### Universal AI Rules
**Location**: `/.ai-rules.md`

Works with any AI assistant (Copilot, Devin, etc.).

---

## Quick Reference by Use Case

### 🔍 I need to cache data
**Read**: [`/docs/development/cache.md`](./development/cache.md)
- Use `RedisTtlCache` for short-term data
- Set appropriate TTLs
- Use `createCacheKey` for consistent naming
- Handle cache misses gracefully

### 📦 I need to store large files
**Read**: [`/docs/development/objectstore.md`](./development/objectstore.md)
- Use `S3ObjectStore` for large files and documents
- Stream large files instead of loading into memory
- Use hierarchical key structures
- Type-safe with generics

### 🔌 I need real-time communication
**Read**: [`/docs/development/websockets.md`](./development/websockets.md) *(In Progress)*
- Use `ForklaunchWebSocket`/`ForklaunchWebSocketServer`
- Define schemas for type safety
- Automatic message validation
- Generate AsyncAPI specs

### 🧪 I need to write tests
**Read**: [`/docs/development/testing.md`](./development/testing.md) *(In Progress)*
- Use `TestContainerManager` for integration tests
- Use `TEST_TOKENS` for auth testing
- `setupTestORM()` for database tests
- Real containers for Redis, PostgreSQL, S3, etc.

### 🔐 I need authentication/authorization
**Read**: [`/docs/development/authorization.md`](./development/authorization.md)
- Use IAM utilities from `@{your-app-name}/iam/utils`
- Use billing utilities from `@{your-app-name}/billing/utils`
- RBAC with roles and permissions
- Feature flags for entitlements

### 🛠️ I need to use CLI commands
**Read**: [`/docs/cli-commands.md`](./cli-commands.md) *(In Progress)*
- Always use `--dry-run` before changes
- Use `forklaunch sync` after manifest changes
- Use `forklaunch env validate` to check variables

### 📚 I need utility functions
**Read**: [`/docs/development/utilities.md`](./development/utilities.md) *(In Progress)*
- String utilities: `camelCase`, `hashString`
- Object utilities: `deepClone`, `sortObjectKeys`
- Type guards: `isRecord`, `isTrue`
- See `.cursorrules` for quick reference

---

## Documentation Status

| Feature | Status | Location |
|---------|--------|----------|
| Cache Module | ✅ Complete | `/docs/development/cache.md` |
| Object Store | ✅ Complete | `/docs/development/objectstore.md` |
| Authorization (IAM/Billing) | ✅ Complete | `/docs/development/authorization.md` |
| HTTP Framework | ✅ Complete | `/docs/development/http.md` |
| Validation | ✅ Complete | `/docs/development/validation.md` |
| Error Handling | ✅ Complete | `/docs/development/error-handling.md` |
| Telemetry | ✅ Complete | `/docs/development/telemetry.md` |
| Universal SDK | ✅ Complete | `/docs/development/universal-sdk.md` |
| Stripe Sync | ✅ Complete | `/docs/development/stripe-plan-sync.md` |
| WebSocket Module | 🔄 In Progress | `/docs/development/websockets.md` |
| Testing Module | 🔄 In Progress | `/docs/development/testing.md` |
| Utilities | 🔄 In Progress | `/docs/development/utilities.md` |
| CLI Commands | 🔄 In Progress | `/docs/cli-commands.md` |
| Controllers | ⏳ Planned | `/docs/development/controllers.md` |
| Services | ⏳ Planned | `/docs/development/services.md` |
| Mappers | ⏳ Planned | `/docs/development/mappers.md` |

---

## Contributing to Documentation

When documenting a new feature:

1. **Read the actual source code** - Never hallucinate APIs
2. **Include accurate types and signatures** - TypeScript is your friend
3. **Provide working examples** - Test your code before documenting
4. **Follow the established format**:
   - Overview section
   - Quick Start with installation
   - Core Concepts
   - Complete API Reference
   - Common Patterns (3-5 real-world examples)
   - Best Practices
   - Testing section
   - Related Documentation links

5. **Sync to both repos**:
   - `/Users/rohinbhargava/forklaunch-js/docs/development/`
   - `/Users/rohinbhargava/forklaunch-platform/client/docs/guides/`

6. **Update AI rules**: Add patterns to `.cursorrules`, `.ai-rules.md`, and Claude skills

---

## Related Resources

- **GitHub**: https://github.com/forklaunch/forklaunch-js
- **Website**: https://forklaunch.com
- **Discord**: https://discord.gg/forklaunch (coming soon)

---

*Last Updated: February 6, 2026*
*Documentation Version: 1.0*
