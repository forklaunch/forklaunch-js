# TSX + MikroORM Decorator Issue - Findings

**Problem**: tsx has compatibility issues with MikroORM decorators when transpiling TypeScript.

**Error**:
```
TypeError: Cannot read properties of undefined (reading 'constructor')
    at __decorateElement
```

---

## What We Tried

### 1. ConfigInjector Skip ✅ (Reverted)
```typescript
if (process.env.FORKLAUNCH_MODE === 'openapi') {
  return {};
}
```
**Result**: Didn't help - entities fail during import, before configInjector runs

### 2. Conditional Entity Import ❌
```typescript
let entities = process.env.FORKLAUNCH_MODE === 'openapi' 
  ? [] 
  : require('./persistence/entities');
```
**Result**: Entities are imported elsewhere (mappers), still fail

### 3. Compiled Version ❌
```bash
node dist/billing-base/server.js
```
**Result**: Module resolution issues with monorepo dependencies

### 4. npm run dev ❌
```bash
npm run dev
```
**Result**: Runs migrations first which also need entities

---

## Root Cause

**MikroORM decorators + tsx transpilation**:
- tsx transpiles TypeScript on-the-fly
- MikroORM decorators execute during class definition
- Decorator code expects fully initialized class
- tsx's transpilation breaks this expectation

---

## Working Solutions

### Option A: Use Compiled Output with Proper Setup

**Build first**, then run with proper module resolution:

```bash
# 1. Build
pnpm run build

# 2. Run from root with NODE_PATH
NODE_PATH=blueprint/node_modules \
FORKLAUNCH_MODE=openapi \
(other env vars...) \
node blueprint/dist/billing-base/server.js
```

**Pros**:
- ✅ Decorators already processed
- ✅ No tsx issues
- ✅ Reliable

**Cons**:
- ⚠️ Requires build step
- ⚠️ Module resolution complexity

### Option B: Fix tsx Configuration

Add tsconfig.json with proper decorator settings:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false  // ✅ This might fix it
  }
}
```

**Try**:
```bash
pnpm exec tsx --tsconfig tsconfig.json server.ts
```

### Option C: Use swc Instead of tsx

tsx uses esbuild which has decorator limitations. Use swc:

```bash
npm install -D @swc/core @swc/cli

# Run with swc
pnpm exec swc-node server.ts
```

### Option D: Create Minimal OpenAPI Server (Best!)

Create a **separate lightweight server** just for OpenAPI export that doesn't import entities:

```typescript
// openapi-server.ts (new file)
import { forklaunchExpress, schemaValidator } from '@forklaunch/blueprint-core';
import { billingPortalRouter } from './api/routes/billingPortal.routes';
// ... other routes

const app = forklaunchExpress(schemaValidator);

// Register routes (routes don't import entities!)
app.use(billingPortalRouter);
app.use(checkoutSessionRouter);
// ... other routes

// Generate OpenAPI
app.listen();
```

**But wait** - routes import controllers, controllers import services, services import mappers, mappers import entities...

---

## Recommended Solution

**Use the ConfigInjector skip + Build First**:

1. **Keep configInjector skip** (re-add it)
2. **Use compiled version**
3. **Fix module resolution** with proper NODE_PATH

### Implementation

```rust
// cli/src/core/openapi_export.rs

pub fn export_all_services(...) -> Result<...> {
    // 1. Build all services first
    build_all_services(app_root)?;
    
    // 2. For each service, run compiled version
    let mut cmd = Command::new("node");
    cmd.arg(format!("dist/modules/{}/server.js", service_name));
    cmd.current_dir(app_root);
    cmd.env("NODE_PATH", format!("{}/node_modules", app_root.display()));
    
    // Set mode
    cmd.env("FORKLAUNCH_MODE", "openapi");
    cmd.env("FORKLAUNCH_OPENAPI_OUTPUT", output_path);
    
    // Set all dummy env vars
    for env_var in service_env_vars {
        cmd.env(&env_var.name, generate_dummy_value(&env_var.name));
    }
    
    cmd.status()?;
}
```

---

## Alternative: Just Use Docker 😅

The irony is that docker-compose probably works fine:

```bash
docker-compose up -d postgres redis
FORKLAUNCH_MODE=openapi npm run dev
```

But defeats the purpose of "no Docker dependency"...

---

## Next Steps

### Immediate
1. Re-add configInjector skip
2. Use `pnpm run build` to compile
3. Run compiled version with proper NODE_PATH
4. Test if it works

### If that fails
1. Investigate tsx vs swc vs ts-node
2. Or accept Docker dependency for OpenAPI export
3. Or create truly static parser (original pure idea)

---

##Status

**Current blocker**: tsx + MikroORM decorator compatibility  
**Best path forward**: Use compiled version with proper module resolution  
**Alternative**: Accept the complexity and use existing dev workflow with Docker

