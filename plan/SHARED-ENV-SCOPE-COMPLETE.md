# Shared Environment Variable Scope Detection - Complete

## Summary
Created a shared utility module for environment variable scope detection that is now used by both `forklaunch environment validate` and `forklaunch release create` commands, providing consistent scope determination across the CLI.

## Architecture

### Shared Module: `core/env_scope.rs`

```rust
pub(crate) enum EnvironmentVariableScope {
    Application,  // Shared across all services/workers
    Service,      // Specific to one service
    Worker,       // Specific to one worker
}

pub(crate) struct ScopedEnvVar {
    pub name: String,
    pub scope: EnvironmentVariableScope,
    pub scope_id: Option<String>,  // service/worker name
    pub used_by: Vec<String>,       // List of projects
}

pub(crate) fn determine_env_var_scopes(
    project_env_vars: &HashMap<String, Vec<EnvVarUsage>>,
    manifest: &ApplicationManifestData,
) -> Result<Vec<ScopedEnvVar>>
```

## Scope Detection Rules

### 1. Application Scope
**When:**
- Variable is used by **multiple projects**
- Variable is used by **`core`** or **`monitoring`** libraries
- Variable is used by a library (non-service, non-worker)

**Examples:**
- `DATABASE_URL` (used by iam, billing, core)
- `JWT_SECRET` (used by iam, core)
- `OTEL_EXPORTER_OTLP_ENDPOINT` (used by core)

### 2. Service Scope
**When:**
- Variable is used by **exactly one service**
- Not used by any other project

**Examples:**
- `STRIPE_SECRET_KEY` (only used by billing service)
- `SENDGRID_API_KEY` (only used by email-service)
- `GITHUB_CLIENT_ID` (only used by auth-service)

### 3. Worker Scope
**When:**
- Variable is used by **exactly one worker**
- Not used by any other project

**Examples:**
- `EMAIL_QUEUE_CONCURRENCY` (only used by email-worker)
- `BATCH_SIZE` (only used by batch-processing-worker)
- `MAX_RETRIES` (only used by retry-worker)

## Command Integration

### 1. `forklaunch environment validate`

**Enhanced Output:**
```bash
forklaunch environment validate
```

```
Validating environment variables...
Workspace: /path/to/my-app
Modules path: /path/to/my-app/src/modules

3 projects found:
  - iam
  - billing
  - core

Validation Results
==================================================

Application-Level Variables (5):
  [OK] DATABASE_URL
  [OK] JWT_SECRET
  [MISSING] OTEL_EXPORTER_OTLP_ENDPOINT
  [OK] OTEL_SERVICE_NAME
  [MISSING] REDIS_URL

Service-Level Variables (2):
  [MISSING] STRIPE_SECRET_KEY (billing)
  [OK] SENDGRID_API_KEY (email-service)

Worker-Level Variables (1):
  [OK] EMAIL_QUEUE_CONCURRENCY (email-worker)

Summary
------------------------------
Projects scanned: 3
Projects with missing vars: 2
Total missing variables: 3
```

**Benefits:**
- ✅ See which variables are app-level vs service/worker-specific
- ✅ Understand configuration organization
- ✅ Know where to set each variable in Platform UI

### 2. `forklaunch release create`

**Enhanced Output:**
```bash
forklaunch release create --version 1.0.0
```

```
[INFO] Creating release 1.0.0...

  Detecting git metadata... [OK]
[INFO] Commit: abc12345 (main)
[INFO] Exporting OpenAPI specifications... [OK] (3 services)
[INFO] Detecting required environment variables... [OK] (8 variables)
[INFO] Application-level: 5
[INFO] Service-level: 2
[INFO] Worker-level: 1
[INFO] Generating release manifest... [OK]
[INFO] Uploading release to platform... [OK]

[OK] Release 1.0.0 created successfully!
```

**Release Manifest:**
```json
{
  "requiredEnvironmentVariables": [
    {
      "name": "DATABASE_URL",
      "scope": "application",
      "description": "Used by: iam, billing, core"
    },
    {
      "name": "STRIPE_SECRET_KEY",
      "scope": "service",
      "scopeId": "billing",
      "description": "Used by: billing"
    },
    {
      "name": "EMAIL_QUEUE_CONCURRENCY",
      "scope": "worker",
      "scopeId": "email-worker",
      "description": "Used by: email-worker"
    }
  ]
}
```

## Code Reusability

### Before (Duplicated Logic)
- ❌ Scope detection in `release/create.rs` only
- ❌ Environment validate didn't show scope
- ❌ Inconsistent behavior between commands
- ❌ Hard to maintain

### After (Shared Utility)
- ✅ Single source of truth in `core/env_scope.rs`
- ✅ Both commands use same logic
- ✅ Consistent scope determination
- ✅ Easy to maintain and update

## Files Created/Modified

### Created:
- `cli/src/core/env_scope.rs` - Shared scope detection logic

### Modified:
- `cli/src/core.rs` - Export env_scope module
- `cli/src/release/create.rs` - Use shared utility, removed duplicate code
- `cli/src/environment/validate.rs` - Enhanced to show scope information
- Platform schemas and types - Updated to support scoped env vars

## Workflow Example

### Step 1: Validate Locally
```bash
cd my-app
forklaunch environment validate
```

**Output shows:**
```
Application-Level Variables (3):
  [MISSING] DATABASE_URL
  [MISSING] JWT_SECRET  
  [OK] OTEL_SERVICE_NAME

Service-Level Variables (1):
  [MISSING] STRIPE_SECRET_KEY (billing)
```

### Step 2: Create Release
```bash
forklaunch release create --version 1.0.0
```

**Output shows:**
```
[INFO] Detecting required environment variables... [OK] (4 variables)
[INFO] Application-level: 3
[INFO] Service-level: 1
```

### Step 3: Platform Uses Scope Info

Platform can now:
1. Show variables organized by scope in UI
2. Set application-level vars once for all services
3. Set service-level vars only for specific services
4. Validate that all scopes have required vars before deployment

## Platform Integration

### UI Display
```
Environment Configuration for production/us-east-1

━━━ Application-Level (affects all services) ━━━
✓ DATABASE_URL: postgresql://...
✓ JWT_SECRET: ••••••••
✗ REDIS_URL: [Not set]

━━━ Service-Level ━━━
billing:
  ✓ STRIPE_SECRET_KEY: ••••••••
  ✗ STRIPE_WEBHOOK_SECRET: [Not set]

email-service:
  ✓ SENDGRID_API_KEY: ••••••••

━━━ Worker-Level ━━━
email-worker:
  ✓ EMAIL_QUEUE_CONCURRENCY: 5
```

### Deployment Validation

```typescript
async function validateBeforeDeploy(release: Release, env: string, region: string) {
  const manifest = await getReleaseManifest(release);
  const requirements = manifest.requiredEnvironmentVariables || [];
  
  for (const req of requirements) {
    const value = await getEnvVar(
      release.application.id,
      env,
      region,
      req.scope,
      req.scopeId,
      req.name
    );
    
    if (!value) {
      throw new Error(
        `Missing ${req.scope}-level variable: ${req.name}` +
        (req.scopeId ? ` for ${req.scopeId}` : '')
      );
    }
  }
}
```

## Benefits

### 1. Developer Experience
- ✅ See scope information in `environment validate`
- ✅ Understand why variables are categorized as they are
- ✅ Know where to configure each variable

### 2. Platform Intelligence  
- ✅ Configure variables at appropriate level
- ✅ Optimize container configurations
- ✅ Improve security boundaries
- ✅ Better error messages

### 3. Code Quality
- ✅ DRY principle (single source of truth)
- ✅ Consistent logic across commands
- ✅ Type-safe enums
- ✅ Easy to test and maintain

### 4. Flexibility
- ✅ Service-specific API keys don't leak to other services
- ✅ Worker-specific configs isolated
- ✅ Shared configs (database, secrets) available everywhere

## Build Status

✅ **Compilation**: Successful (4.18s)  
✅ **Shared Module**: Working  
✅ **Both Commands**: Using shared logic  
⚠️  **Warnings**: 4 dead code warnings (harmless)  

## Summary

Environment variable scope detection is now:
- ✅ **Shared** across multiple commands
- ✅ **Consistent** in behavior and output
- ✅ **Visible** in both validate and release commands
- ✅ **Type-safe** with Rust enums
- ✅ **Intelligent** based on actual usage patterns

Users can now:
1. Run `forklaunch environment validate` to see scoped variables locally
2. Run `forklaunch release create` to include scoped info in release manifest
3. Configure variables at the correct scope in Platform UI
4. Deploy with confidence knowing all scopes are validated

The CLI and platform now have complete, intelligent environment variable management! 🎉

