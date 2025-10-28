# Environment Variable Auto-Detection - Complete

## Summary
The `forklaunch release create` command now automatically detects required environment variables from your application code and includes them in the release manifest. This enables the platform to validate that all required variables are configured before deployment.

## How It Works

### Detection Process
When you run `forklaunch release create`:

1. **Scans all `registrations.ts` files** in your workspace
2. **Extracts `getEnvVar()` calls** using AST parsing
3. **Collects unique variable names** across all projects
4. **Includes them in release manifest** uploaded to platform

### Example

**Your code** (`src/modules/iam/registrations.ts`):
```typescript
const config = {
  JWT_SECRET: {
    type: string,
    value: getEnvVar('JWT_SECRET'),  // ← Auto-detected
  },
  DATABASE_URL: {
    type: string,
    value: getEnvVar('DATABASE_URL'),  // ← Auto-detected
  },
};
```

**Release manifest** (auto-generated):
```json
{
  "version": "1.0.0",
  "gitCommit": "abc123",
  "timestamp": "2025-10-15T12:00:00Z",
  "services": [...],
  "infrastructure": {...},
  "requiredEnvironmentVariables": [
    "DATABASE_URL",
    "JWT_SECRET",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_SERVICE_NAME"
  ]
}
```

## Implementation Details

### Files Modified

**1. `cli/src/release/create.rs`**
- Added import for `find_all_env_vars` from AST infrastructure
- Added env var detection step before manifest generation
- Collects and deduplicates env var names
- Passes to `generate_release_manifest()`

**2. `cli/src/release/manifest_generator.rs`**
- Updated `generate_release_manifest()` to accept `required_env_vars: Vec<String>`
- Removed hardcoded env var list
- Uses actual detected variables from code

### Code Changes

**Before:**
```rust
let release_manifest = generate_release_manifest(
    version.clone(),
    git_commit.clone(),
    git_branch.clone(),
    &manifest,
    &openapi_specs,
)?;
```

**After:**
```rust
// Detect required environment variables
let modules_path = get_modules_path(&workspace_root)?;
let project_env_vars = find_all_env_vars(&modules_path)?;

// Collect unique env var names
let mut required_env_vars: HashSet<String> = HashSet::new();
for (_project_name, env_vars) in &project_env_vars {
    for env_var in env_vars {
        required_env_vars.insert(env_var.var_name.clone());
    }
}
let mut required_env_vars: Vec<String> = required_env_vars.into_iter().collect();
required_env_vars.sort();

let release_manifest = generate_release_manifest(
    version.clone(),
    git_commit.clone(),
    git_branch.clone(),
    &manifest,
    &openapi_specs,
    required_env_vars.clone(),
)?;
```

## CLI Output

### Before:
```
[INFO] Creating release 1.0.0...
  Detecting git metadata... [OK]
[INFO] Exporting OpenAPI specifications... [OK] (2 services)
[INFO] Generating release manifest... [OK]
```

### After:
```
[INFO] Creating release 1.0.0...
  Detecting git metadata... [OK]
[INFO] Exporting OpenAPI specifications... [OK] (2 services)
[INFO] Detecting required environment variables... [OK] (5 variables)
[INFO] Generating release manifest... [OK]
```

## Benefits

### 1. Automatic Detection
- ✅ No manual env var listing required
- ✅ Always accurate and up-to-date
- ✅ Scans all projects in workspace
- ✅ Catches new variables automatically

### 2. Platform Validation
- ✅ Platform knows what env vars are required
- ✅ Can warn if variables are missing before deployment
- ✅ Better error messages for config issues
- ✅ Prevents failed deployments due to missing vars

### 3. Developer Experience
- ✅ See how many variables are needed at release time
- ✅ Use `forklaunch environment validate` to check if they're defined locally
- ✅ Platform UI can show which required vars are not yet set
- ✅ Clear feedback loop

### 4. Documentation
- ✅ Release manifest serves as documentation
- ✅ Platform can generate env var templates
- ✅ Easy to see what's needed for each release version

## Workflow Integration

### Step-by-Step
```bash
# 1. Check what variables your app needs (optional, for local verification)
forklaunch environment validate

# 2. Create release (auto-detects and includes env vars)
forklaunch release create --version 1.0.0
# Output: [INFO] Detecting required environment variables... [OK] (5 variables)

# 3. Platform now knows the app needs 5 environment variables

# 4. Set variables in Platform UI
# Platform can show: "This release requires: DATABASE_URL, JWT_SECRET, ..."

# 5. Deploy
forklaunch deploy create --release 1.0.0 --environment production --region us-east-1
# Platform validates all required vars are set before deploying
```

## Platform Integration

The platform can now:

1. **Validate before deployment**
   ```typescript
   const release = await getReleaseManifest(releaseId);
   const requiredVars = release.requiredEnvironmentVariables;
   const setVars = await getEnvironmentVariables(appId, env, region);
   
   const missingVars = requiredVars.filter(v => !setVars[v]);
   if (missingVars.length > 0) {
     throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
   }
   ```

2. **Show in UI**
   ```
   Release 1.0.0
   Required Environment Variables (5):
   ✓ DATABASE_URL (set)
   ✓ JWT_SECRET (set)
   ✗ OTEL_SERVICE_NAME (not set)
   ✗ OTEL_EXPORTER_OTLP_ENDPOINT (not set)
   ✓ STRIPE_SECRET_KEY (set)
   ```

3. **Generate templates**
   ```bash
   # Download .env template for release
   curl https://api.forklaunch.com/releases/123/env-template
   
   # Returns:
   DATABASE_URL=
   JWT_SECRET=
   OTEL_SERVICE_NAME=
   OTEL_EXPORTER_OTLP_ENDPOINT=
   STRIPE_SECRET_KEY=
   ```

## AST Parsing Logic

Uses the existing `find_all_env_vars()` function from `cli/src/core/ast/infrastructure/env.rs`:

1. Finds all `registrations.ts` files in workspace
2. Parses TypeScript AST using `oxc` parser
3. Visits all `CallExpression` nodes
4. Finds calls to `getEnvVar("VAR_NAME")`
5. Extracts variable names
6. Deduplicates and sorts

This is the same battle-tested logic used by `forklaunch environment validate` and `forklaunch environment sync`.

## Testing

```bash
# Create test app with env vars
forklaunch init application test-app --database postgresql
cd test-app

# Add some env vars to registrations.ts
# (JWT_SECRET, DATABASE_URL, etc.)

# Create release and verify env vars are detected
forklaunch release create --version 0.0.1 --dry-run

# Check the manifest file
cat dist/release-manifest.json | jq '.requiredEnvironmentVariables'
# Should show: ["DATABASE_URL", "JWT_SECRET", "OTEL_EXPORTER_OTLP_ENDPOINT", ...]
```

## Build Status

✅ **Compilation**: Successful (3.11s)  
✅ **No Errors**: Clean build  
⚠️  **Warnings**: 2 dead code warnings (expected, harmless)

## Summary

**Total Changes**: 2 files modified
- `cli/src/release/create.rs` - Added env var detection step
- `cli/src/release/manifest_generator.rs` - Accept and use detected env vars

The release manifest now includes a complete, accurate list of required environment variables automatically detected from your code! This enables:
- Platform-side validation before deployment
- Better error messages when variables are missing
- Auto-generated .env templates
- Self-documenting releases

No more manual env var lists - it's all automatic! 🎉

