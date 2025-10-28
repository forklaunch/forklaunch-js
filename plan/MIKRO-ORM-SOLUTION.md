# MikroORM Initialization Solution for OpenAPI Mode

**Problem**: `MIKRO_ORM_SKIP_DB_CONNECTION` doesn't help because MikroORM Configuration validates the database config **before** attempting to connect.

**Error**:
```
Error: No database specified, please fill in `dbName` or `clientUrl` option
    at Configuration.validateOptions
```

This happens in the **Configuration constructor**, not during connection.

---

## Solution: Skip MikroORM Initialization in OpenAPI Mode

### Option 1: Check Mode Before Registration (Recommended)

Update the registration factory to skip MikroORM entirely in OpenAPI mode:

**File**: `src/modules/platform-management/registrations.ts`

```typescript
// Around line 119-123
{
  token: MikroOrmToken,
  factory: () => {
    // ✅ Skip MikroORM initialization in OpenAPI export mode
    if (process.env.FORKLAUNCH_MODE === 'openapi') {
      console.log('[OpenAPI Mode] Skipping MikroORM initialization');
      return null;  // Return null or mock object
    }
    
    // Normal initialization
    return MikroORM.initSync(mikroOrmConfig);
  },
  scope: "singleton" as const,
}
```

### Option 2: Return Mock ORM Instance

If other parts of the code expect an ORM instance, return a mock:

```typescript
{
  token: MikroOrmToken,
  factory: () => {
    // ✅ Return mock ORM in OpenAPI mode
    if (process.env.FORKLAUNCH_MODE === 'openapi') {
      console.log('[OpenAPI Mode] Using mock MikroORM instance');
      return createMockORM();
    }
    
    return MikroORM.initSync(mikroOrmConfig);
  },
  scope: "singleton" as const,
}

function createMockORM() {
  return {
    em: {
      fork: () => ({
        // Mock entity manager methods if needed
        findOne: async () => null,
        find: async () => [],
        persist: async () => {},
        flush: async () => {},
      }),
    },
    close: async () => {},
    getMetadata: () => ({
      getAll: () => [],
    }),
  } as any;
}
```

### Option 3: Provide Dummy Config in OpenAPI Mode

If you want MikroORM to initialize but not connect:

```typescript
{
  token: MikroOrmToken,
  factory: () => {
    // ✅ Use dummy config in OpenAPI mode
    if (process.env.FORKLAUNCH_MODE === 'openapi') {
      console.log('[OpenAPI Mode] Using dummy database config');
      
      const dummyConfig = {
        ...mikroOrmConfig,
        dbName: 'dummy',
        clientUrl: 'sqlite::memory:',  // In-memory SQLite (doesn't actually connect)
        type: 'better-sqlite',
        connect: false,  // Don't auto-connect
      };
      
      return MikroORM.initSync(dummyConfig);
    }
    
    return MikroORM.initSync(mikroOrmConfig);
  },
  scope: "singleton" as const,
}
```

---

## Recommended Approach

**Use Option 1** (Skip entirely) because:
- ✅ Fastest - no ORM initialization at all
- ✅ Simplest - just return null
- ✅ No risk of connection attempts
- ✅ Clear intent - we don't need ORM for OpenAPI

**Update controllers/services** that inject MikroORM to handle null:

```typescript
class MyController {
  constructor(
    @Inject(MikroOrmToken) private orm: MikroORM | null
  ) {}
  
  async someMethod() {
    // Skip database operations in OpenAPI mode
    if (!this.orm) {
      return [];
    }
    
    const em = this.orm.em.fork();
    // ... normal database operations
  }
}
```

---

## Updated CLI Environment Variables

With this approach, the CLI should set:

```rust
Command::new("pnpm")
    .args(&["tsx", "server.ts"])
    .env("FORKLAUNCH_MODE", "openapi")  // ✅ This is what matters
    .env("DOTENV_FILE_PATH", ".env.local")
    // No need for MIKRO_ORM_SKIP_DB_CONNECTION anymore
    .status()?
```

---

## Testing

```bash
# Test that OpenAPI export works without database
cd src/modules/platform-management

# Set mode
export FORKLAUNCH_MODE=openapi
export FORKLAUNCH_OPENAPI_OUTPUT=openapi.json
export DOTENV_FILE_PATH=.env.local

# Run without database
pnpm tsx server.ts

# Should output:
# [OpenAPI Mode] Skipping MikroORM initialization
# [OpenAPI Mode] Exporting OpenAPI specs...
# [OpenAPI Mode] Done!
```

---

## Complete Implementation

**File**: `src/modules/platform-management/registrations.ts`

```typescript
import { MikroORM } from "@mikro-orm/core";
import { mikroOrmConfig } from "./mikro-orm.config";

// ... other imports ...

export const platformManagementServiceRegistrations: ForkLaunchServiceRegistration<any>[] = [
  // ... other registrations ...
  
  {
    token: MikroOrmToken,
    factory: () => {
      // ✅ SOLUTION: Skip MikroORM in OpenAPI export mode
      if (process.env.FORKLAUNCH_MODE === 'openapi') {
        console.log('[OpenAPI Mode] Skipping MikroORM initialization');
        
        // Return minimal mock to satisfy type requirements
        return {
          em: {
            fork: () => ({
              findOne: async () => null,
              find: async () => [],
              persist: async () => {},
              flush: async () => {},
            }),
          },
          close: async () => {},
        } as any;
      }
      
      // Normal initialization for regular mode
      return MikroORM.initSync(mikroOrmConfig);
    },
    scope: "singleton" as const,
  },
  
  // ... rest of registrations ...
];
```

---

## Why This Works

1. **Early Check**: We check `FORKLAUNCH_MODE` **before** MikroORM.initSync
2. **No Validation**: MikroORM Configuration.validateOptions never runs
3. **No Connection**: No database connection is attempted
4. **Type Safe**: Return type matches expectations (or null)
5. **Clear Intent**: Console log shows we're in OpenAPI mode

---

## Alternative: Check in mikro-orm.config.ts

You could also check in the config file itself:

**File**: `src/modules/platform-management/mikro-orm.config.ts`

```typescript
import { Options } from '@mikro-orm/core';

export const mikroOrmConfig: Options = {
  // If in OpenAPI mode, provide dummy config
  ...(process.env.FORKLAUNCH_MODE === 'openapi' 
    ? {
        dbName: 'dummy',
        clientUrl: 'sqlite::memory:',
        type: 'better-sqlite',
      }
    : {
        dbName: process.env.DATABASE_NAME || 'platform_management',
        clientUrl: process.env.DATABASE_URL,
        type: process.env.DATABASE_TYPE || 'postgresql',
      }
  ),
  
  entities: ['./persistence/entities/**/*.ts'],
  // ... rest of config
};
```

But **Option 1 (skip in registrations.ts) is cleaner** because it avoids initializing MikroORM at all.

---

## Summary

**Problem**: MikroORM Configuration validates database config before connection  
**Solution**: Check `FORKLAUNCH_MODE === 'openapi'` in factory and skip initialization  
**Result**: OpenAPI export works without database, Docker, or any connection

**CLI sets**: `FORKLAUNCH_MODE=openapi` (that's all you need!)  
**Framework checks**: Mode before initializing MikroORM  
**Works**: Without database running ✅

