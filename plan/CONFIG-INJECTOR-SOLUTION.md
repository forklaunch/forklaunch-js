# ConfigInjector Solution for OpenAPI Mode

**Best Solution**: Add a check in `configInjector.ts` to skip ALL factory invocations in OpenAPI mode.

## Why This Is Better

Instead of modifying every registration, we modify the **dependency injection system itself** to skip resolution in OpenAPI mode. This:

- ✅ Works for ALL registrations (MikroORM, Redis, etc.)
- ✅ No need to modify individual registrations
- ✅ Centralized logic in one place
- ✅ Zero overhead - no factory calls at all
- ✅ Controllers/services get empty objects (which they won't use anyway)

---

## Implementation

**File**: `framework/core/src/services/configInjector.ts`

**Method**: `resolveInstance` (around line 90-105)

Add this check at the **very beginning** of the method:

```typescript
private resolveInstance<T extends keyof CV>(
  token: T,
  definition:
    | ConstructedSingleton<
        CV[T],
        Omit<ResolvedConfigValidator<SV, CV>, T>,
        ResolvedConfigValidator<SV, CV>[T]
      >
    | Constructed<
        CV[T],
        Omit<ResolvedConfigValidator<SV, CV>, T>,
        ResolvedConfigValidator<SV, CV>[T]
      >,
  context?: Record<string, unknown>,
  resolutionPath: (keyof CV)[] = []
): ResolvedConfigValidator<SV, CV>[T] {
  
  // ✅ ADD THIS CHECK FIRST - Skip all factory invocations in OpenAPI mode
  if (process.env.FORKLAUNCH_MODE === 'openapi') {
    // Return empty object - services won't actually use these dependencies
    // since the application exits immediately after generating OpenAPI
    return {} as ResolvedConfigValidator<SV, CV>[T];
  }
  
  // ... rest of existing code ...
  const injectorArgument = extractArgumentNames(definition.factory)[0];
  // short circuit as no args
  if (!injectorArgument || injectorArgument === '_args') {
    return definition.factory(
      {} as Omit<ResolvedConfigValidator<SV, CV>, T>,
      this.resolve.bind(this),
      context ?? ({} as Record<string, unknown>)
    );
  }
  
  // ... rest remains the same ...
}
```

---

## Complete Modified Method

```typescript
private resolveInstance<T extends keyof CV>(
  token: T,
  definition:
    | ConstructedSingleton<
        CV[T],
        Omit<ResolvedConfigValidator<SV, CV>, T>,
        ResolvedConfigValidator<SV, CV>[T]
      >
    | Constructed<
        CV[T],
        Omit<ResolvedConfigValidator<SV, CV>, T>,
        ResolvedConfigValidator<SV, CV>[T]
      >,
  context?: Record<string, unknown>,
  resolutionPath: (keyof CV)[] = []
): ResolvedConfigValidator<SV, CV>[T] {
  
  // ✅ Skip all dependency resolution in OpenAPI export mode
  if (process.env.FORKLAUNCH_MODE === 'openapi') {
    console.log(`[OpenAPI Mode] Skipping resolution for: ${String(token)}`);
    return {} as ResolvedConfigValidator<SV, CV>[T];
  }
  
  const injectorArgument = extractArgumentNames(definition.factory)[0];
  // short circuit as no args
  if (!injectorArgument || injectorArgument === '_args') {
    return definition.factory(
      {} as Omit<ResolvedConfigValidator<SV, CV>, T>,
      this.resolve.bind(this),
      context ?? ({} as Record<string, unknown>)
    );
  }

  if (!injectorArgument.startsWith('{') || !injectorArgument.endsWith('}')) {
    throw new Error(
      `Invalid injector argument for ${String(
        token
      )}: ${injectorArgument}. Please use object destructuring syntax: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment.`
    );
  }
  const resolvedArguments = Object.fromEntries(
    injectorArgument
      .replace('{', '')
      .replace('}', '')
      .split(',')
      .map((arg) => arg.split(':')[0].trim())
      .map((arg) => {
        const newResolutionPath = [...resolutionPath, token];
        if (resolutionPath.includes(arg)) {
          throw new Error(
            `Circular dependency detected: ${newResolutionPath.join(
              ' -> '
            )} -> ${arg}`
          );
        }
        const resolvedArg = this.resolve(arg, context, newResolutionPath);
        return [arg, resolvedArg];
      })
  ) as unknown as Omit<ResolvedConfigValidator<SV, CV>, T>;
  return definition.factory(
    resolvedArguments,
    this.resolve.bind(this),
    context ?? ({} as Record<string, unknown>)
  );
}
```

---

## How It Works

### Before (Current Behavior)

```
Application starts
  ↓
ConfigInjector.resolve("MikroOrmToken")
  ↓
resolveInstance()
  ↓
Resolve dependencies
  ↓
Call factory()
  ↓
MikroORM.initSync()
  ↓
Configuration validation
  ↓
ERROR: No database specified
```

### After (With Fix)

```
Application starts with FORKLAUNCH_MODE=openapi
  ↓
ConfigInjector.resolve("MikroOrmToken")
  ↓
resolveInstance()
  ↓
Check: if (FORKLAUNCH_MODE === 'openapi')
  ↓
Return {} immediately
  ↓
No factory invocation
  ↓
No MikroORM initialization
  ↓
No error! ✅
```

---

## Benefits

### 1. Universal Solution
Works for **all** expensive/problematic dependencies:
- MikroORM (database)
- Redis connections
- Kafka connections
- Any external service

### 2. Centralized
- One change fixes everything
- No need to modify registrations
- Easy to maintain

### 3. Performance
- No factory invocations at all
- Fastest possible startup
- Minimal memory usage

### 4. Clean
- Controllers get empty objects
- They never use them (app exits after OpenAPI gen)
- Type-safe (returns correct type)

---

## Optional: Add Logging

If you want to see what's being skipped:

```typescript
if (process.env.FORKLAUNCH_MODE === 'openapi') {
  if (process.env.DEBUG) {
    console.log(`[OpenAPI Mode] Skipping resolution for: ${String(token)}`);
  }
  return {} as ResolvedConfigValidator<SV, CV>[T];
}
```

---

## Testing

```bash
cd src/modules/platform-management

# Test with mode enabled
export FORKLAUNCH_MODE=openapi
export FORKLAUNCH_OPENAPI_OUTPUT=test.json
export DOTENV_FILE_PATH=.env.local

pnpm tsx server.ts

# Should see:
# [OpenAPI Mode] Skipping resolution for: MikroOrmToken
# [OpenAPI Mode] Skipping resolution for: RedisToken
# (etc.)
# [OpenAPI Mode] Generating OpenAPI specs...
# Done!

# No database errors! ✅
```

---

## What About Controllers?

Controllers that inject dependencies will get empty objects:

```typescript
class MyController {
  constructor(
    @Inject(MikroOrmToken) private orm: MikroORM  // This will be {}
  ) {}
  
  async getUsers() {
    // This code never runs in OpenAPI mode!
    // The app exits after generating specs
    const em = this.orm.em.fork();
    return em.find(User, {});
  }
}
```

**Why this works**:
- Controller methods are **never called** in OpenAPI mode
- App only needs to **register routes** (which happens at startup)
- OpenAPI is generated from **route metadata**, not by calling handlers
- App exits immediately after generation

---

## CLI Usage (No Changes Needed)

The CLI just sets the mode:

```rust
Command::new("pnpm")
    .args(&["tsx", "server.ts"])
    .env("FORKLAUNCH_MODE", "openapi")  // ✅ ConfigInjector checks this
    .env("DOTENV_FILE_PATH", ".env.local")
    .env("FORKLAUNCH_OPENAPI_OUTPUT", &output_path)
    .status()?
```

That's it! No other env vars needed.

---

## Edge Cases

### What if a controller constructor has logic?

```typescript
class MyController {
  constructor(
    @Inject(MikroOrmToken) private orm: MikroORM
  ) {
    // ⚠️ This runs even in OpenAPI mode!
    console.log('Controller created');
  }
}
```

**Solution**: Keep constructors minimal. Initialization logic should go in methods, not constructors.

### What if a service needs real data?

```typescript
class MyService {
  constructor(
    @Inject(MikroOrmToken) private orm: MikroORM
  ) {}
  
  async getSomething() {
    return this.orm.em.find(...);  // Would fail with empty object
  }
}
```

**Answer**: This method is never called in OpenAPI mode. The app only:
1. Registers routes
2. Generates OpenAPI from metadata
3. Exits

No route handlers are ever invoked.

---

## Summary

**Best Solution**: Add 3 lines to `configInjector.ts`:

```typescript
if (process.env.FORKLAUNCH_MODE === 'openapi') {
  return {} as ResolvedConfigValidator<SV, CV>[T];
}
```

**Benefits**:
- ✅ One change fixes all dependency issues
- ✅ No database, Redis, or any external services needed
- ✅ Fast OpenAPI generation
- ✅ Works for all services automatically
- ✅ Type-safe and clean

**Result**: OpenAPI export works perfectly without any running services! 🎉

