# Architecture Clarifications Summary

**Date**: 2024-10-17  
**Status**: Critical architecture updates from user

---

## 🎯 Key Architecture Changes

Based on user feedback, the actual ForkLaunch architecture differs from initial assumptions in two important ways:

### 1. ✅ Single Dockerfile (Monorepo Pattern)

**Previous Understanding**:
- One Dockerfile per service
- One Dockerfile per worker
- Each builds independently

**Actual Architecture**:
- **ONE Dockerfile** for the entire monorepo
- All services and workers built from same Docker image
- Different start commands differentiate services/workers

**Impact**: **SIMPLIFIES** Dockerfile upload (just one file!)

### 2. ✅ Multi-Version OpenAPI (Versioned APIs)

**Previous Understanding**:
- One OpenAPI spec per service
- Single API version

**Actual Architecture**:
- **Multiple OpenAPI versions** per service
- Format: `{ "v1": {...}, "v2": {...}, "v3": {...} }`
- Platform reads routes from ALL versions

**Impact**: **COMPLICATES** OpenAPI handling (need version detection)

---

## 📁 Updated Folder Structure

### S3 Release Artifacts

```
s3://forklaunch-platform/applications/{appId}/releases/{version}/
├── manifest.json                    # Release manifest
├── Dockerfile                       # ✅ Single file at root
└── artifacts/
    ├── services/
    │   ├── iam-base/
    │   │   ├── openapi/
    │   │   │   ├── v1.json          # ✅ Version-specific
    │   │   │   ├── v2.json          # ✅ Version-specific
    │   │   │   └── v3.json          # ✅ etc.
    │   │   └── config.json          # Build & runtime config
    │   └── billing-base/
    │       ├── openapi/
    │       │   └── v1.json
    │       └── config.json
    └── workers/
        └── email-worker/
            └── config.json          # No OpenAPI for workers
```

**Key Changes**:
- ❌ **NO** `services/{id}/Dockerfile`
- ❌ **NO** `workers/{id}/Dockerfile`
- ✅ **YES** Root-level `Dockerfile`
- ✅ **YES** `services/{id}/openapi/{version}.json` (multiple versions)

---

## 🔧 Updated Implementation Details

### 1. Dockerfile Collection (SIMPLER)

**Before**:
```rust
// Collect per service/worker
for project in projects {
    let dockerfile = read(format!("modules/{}/Dockerfile", project));
    dockerfiles.insert(project, dockerfile);
}
```

**After** (✅ SIMPLER):
```rust
// Just read one file
let dockerfile = read_to_string("Dockerfile")?;
```

### 2. OpenAPI Collection (MORE COMPLEX)

**Before**:
```rust
// Single version
export_openapi(service) -> openapi.json
```

**After** (⚠️ MORE COMPLEX):
```rust
// Multiple versions
for version in detect_versions(service) {
    export_openapi(service, version) -> openapi/{version}.json
}
```

### 3. Build Config (NEW: Runtime Commands)

Since all services/workers share ONE Dockerfile, we need to specify:

```rust
pub struct BuildConfig {
    build: BuildSettings {
        dockerfile: "Dockerfile",    // Same for all
    },
    runtime: RuntimeSettings {
        command: "node dist/modules/iam-base/server.js",  // ✅ Different per service
    },
}
```

**Example Runtime Commands**:
- IAM Service: `node dist/modules/iam-base/server.js`
- Billing Service: `node dist/modules/billing-base/server.js`
- Email Worker: `node dist/modules/email-worker/worker.js`

---

## 📊 Updated Work Estimates

| Task | Before | After | Reason |
|------|--------|-------|--------|
| **Dockerfile Upload** | 1 day | **0.5 day** | ✅ Simpler (single file) |
| **OpenAPI Export** | 1 day | **1.5 days** | ⚠️ More complex (multi-version) |
| **Build Configs** | 0.5 day | **1 day** | ⚠️ Need runtime commands |
| **Total** | 2.5 days | **3 days** | Net same |

**Net Result**: About the same total effort, just distributed differently.

---

## 🔄 Updated CLI Upload Format

```rust
#[derive(Debug, Serialize)]
struct CreateReleaseRequest {
    application_id: String,
    manifest: ReleaseManifest,
    
    // ✅ Single Dockerfile
    dockerfile: String,
    
    // ✅ OpenAPI with versions
    #[serde(rename = "openapiSpecs")]
    openapi_specs: HashMap<String, HashMap<String, Value>>,
    // Structure: { "iam-base": { "v1": {...}, "v2": {...} } }
    
    // ✅ Build configs with runtime commands
    #[serde(rename = "buildConfigs")]
    build_configs: HashMap<String, BuildConfig>,
    
    released_by: Option<String>,
}
```

**Example Request**:
```json
{
  "applicationId": "app-123",
  "manifest": {...},
  
  "dockerfile": "FROM node:20-alpine\nWORKDIR /app\n...",
  
  "openapiSpecs": {
    "iam-base": {
      "v1": { /* OpenAPI 3.1 document */ },
      "v2": { /* OpenAPI 3.1 document */ }
    },
    "billing-base": {
      "v1": { /* OpenAPI 3.1 document */ }
    }
  },
  
  "buildConfigs": {
    "iam-base": {
      "build": { "dockerfile": "Dockerfile" },
      "runtime": { "command": "node dist/modules/iam-base/server.js" }
    },
    "billing-base": {
      "build": { "dockerfile": "Dockerfile" },
      "runtime": { "command": "node dist/modules/billing-base/server.js" }
    }
  }
}
```

---

## 🏗️ Platform Implementation Changes

### 1. Store Single Dockerfile

```typescript
// Store at root level, not per-service
await s3.putObject({
  Key: `applications/${appId}/releases/${version}/Dockerfile`,
  Body: req.dockerfile,
});
```

### 2. Store OpenAPI Per Version

```typescript
// Store each version separately
for (const [serviceId, versions] of Object.entries(req.openapiSpecs)) {
  for (const [version, spec] of Object.entries(versions)) {
    await s3.putObject({
      Key: `applications/${appId}/releases/${version}/artifacts/services/${serviceId}/openapi/${version}.json`,
      Body: JSON.stringify(spec),
    });
  }
}
```

### 3. Create Routes Per Version

```typescript
async function createRoutesFromOpenApiSpecs(
  releaseId: string,
  openapiSpecs: Record<string, Record<string, OpenAPIDocument>>
) {
  for (const [serviceId, versions] of Object.entries(openapiSpecs)) {
    for (const [apiVersion, spec] of Object.entries(versions)) {
      // Extract routes from spec
      for (const [path, pathItem] of Object.entries(spec.paths || {})) {
        for (const [method, operation] of Object.entries(pathItem)) {
          await routeRepo.create({
            releaseId,
            serviceId,
            apiVersion,     // ✅ Track version
            method: method.toUpperCase(),
            path,
            operationId: operation.operationId,
            // ... other fields
          });
        }
      }
    }
  }
}
```

### 4. Use Runtime Commands in Container Definitions

```typescript
function generateContainerDefinition(
  service: Service, 
  buildConfig: BuildConfig
) {
  return {
    image: `${buildConfig.image.registry}/${buildConfig.image.repository}:${buildConfig.image.tag}`,
    
    // ✅ Use runtime command from build config
    command: buildConfig.runtime.command.split(' '),
    
    workingDirectory: buildConfig.runtime.working_dir || '/app',
    // ... other settings
  };
}
```

---

## ✅ Benefits of This Architecture

### Single Dockerfile (Monorepo)
✅ **Faster builds** - One build produces all services  
✅ **Consistent dependencies** - All services use same versions  
✅ **Simpler CI/CD** - One Docker build step  
✅ **Shared layers** - Better caching, smaller storage  
✅ **Easier updates** - Update base image once  

### Multi-Version OpenAPI
✅ **API evolution** - Support v1, v2, v3 simultaneously  
✅ **Gradual migration** - Clients upgrade at their pace  
✅ **Better tracking** - Know which version each route is in  
✅ **Deprecation** - Remove old versions cleanly  
✅ **Testing** - Test new versions alongside old  

---

## 🎯 Updated Priority Tasks

### Day 1: Single Dockerfile + Version Detection (1 day)
- ✅ Collect single Dockerfile from root
- ✅ Add API version detection logic
- ✅ Update CreateReleaseRequest structure

### Day 2: Multi-Version OpenAPI Export (1.5 days)
- ⚠️ Update framework to support version parameter
- ⚠️ Update CLI to export per version
- ⚠️ Update manifest generator for versioned specs

### Day 3: Build Configs with Runtime Commands (0.5 day)
- ✅ Add RuntimeSettings to BuildConfig
- ✅ Generate per-service/worker commands
- ✅ Documentation updates

---

## 📝 Framework Changes Needed

The framework needs to support exporting specific API versions:

```typescript
// framework/express/src/expressApplication.ts

if (process.env.FORKLAUNCH_MODE === 'openapi') {
  const requestedVersion = process.env.FORKLAUNCH_OPENAPI_VERSION || 'v1';
  
  // Filter routes by version prefix
  const versionedRoutes = this.routes.filter(route => 
    route.path.startsWith(`/${requestedVersion}/`) || 
    route.path.startsWith(`/api/${requestedVersion}/`)
  );
  
  const openApiSpec = generateOpenApiSpecs<SV>(
    this.schemaValidator,
    [],
    versionedRoutes,  // ✅ Only include this version's routes
    this,
    {
      ...this.openapiConfiguration,
      servers: [{ url: `/${requestedVersion}` }]  // ✅ Version in server URL
    }
  );
  
  fs.writeFileSync(
    process.env.FORKLAUNCH_OPENAPI_OUTPUT as string,
    JSON.stringify(openApiSpec, null, 2)
  );
  
  process.exit(0);
}
```

**Usage**:
```bash
# Export v1 API
FORKLAUNCH_MODE=openapi \
FORKLAUNCH_OPENAPI_VERSION=v1 \
FORKLAUNCH_OPENAPI_OUTPUT=dist/iam-base/openapi/v1.json \
npm run dev

# Export v2 API
FORKLAUNCH_MODE=openapi \
FORKLAUNCH_OPENAPI_VERSION=v2 \
FORKLAUNCH_OPENAPI_OUTPUT=dist/iam-base/openapi/v2.json \
npm run dev
```

---

## 🔍 Version Detection Strategy

How does the CLI detect which API versions a service has?

### Option 1: Convention-Based (Recommended)
```rust
fn detect_api_versions(service_path: &Path) -> Result<Vec<String>> {
    // Look for version prefixes in route registrations
    let registrations = read_to_string(service_path.join("registrations.ts"))?;
    
    let mut versions = HashSet::new();
    
    // Regex to find version patterns: /v1/, /v2/, /api/v1/, etc.
    let re = Regex::new(r#"['"](?:/api)?/(v\d+)/"#)?;
    
    for cap in re.captures_iter(&registrations) {
        if let Some(version) = cap.get(1) {
            versions.insert(version.as_str().to_string());
        }
    }
    
    if versions.is_empty() {
        versions.insert("v1".to_string());  // Default
    }
    
    Ok(versions.into_iter().collect())
}
```

### Option 2: Manifest-Based
Add to manifest:
```toml
[[projects]]
name = "iam-base"
type = "service"
api_versions = ["v1", "v2"]  # ✅ Explicit declaration
```

### Option 3: Try-All
```rust
// Try exporting v1, v2, v3, etc. until one fails
for i in 1..10 {
    let version = format!("v{}", i);
    match export_version(&service, &version) {
        Ok(_) => versions.push(version),
        Err(_) => break,
    }
}
```

**Recommendation**: Start with Option 1 (convention), add Option 2 later if needed.

---

## 📖 Updated Documentation Needs

### APPLICATION_ONBOARDING_INPUTS.md
- ✅ Update to show single Dockerfile at root
- ✅ Update to show versioned OpenAPI structure
- ✅ Add runtime command examples
- ✅ Update S3 folder structure diagrams

### CLI_RELEASE_ARTIFACTS.md (NEW)
- ✅ Document single Dockerfile pattern
- ✅ Document multi-version OpenAPI format
- ✅ Document build config with runtime commands
- ✅ Add complete example requests

### Platform API Docs
- ✅ Update POST /releases endpoint spec
- ✅ Document versioned OpenAPI format
- ✅ Document route creation per version
- ✅ Add examples with multi-version services

---

## ✅ Summary

**What Changed**:
1. ✅ **Single Dockerfile** - Simpler upload, need runtime commands
2. ✅ **Multi-Version OpenAPI** - More complex detection & export
3. ✅ **Net Same Effort** - ~3 days total

**What's Better**:
- Dockerfile upload is now trivial (just read one file)
- Monorepo pattern is cleaner and more maintainable
- API versioning is more powerful and flexible

**What's More Complex**:
- Need to detect API versions per service
- Need to export OpenAPI per version
- Framework needs version filtering support

**Updated Documents**:
- ✅ UPDATED-IMPLEMENTATION-NOTES.md (this file)
- ✅ IMMEDIATE-ACTION-ITEMS.md (updated with correct architecture)
- 🔶 Need to update: CLI-ALIGNMENT-WITH-ONBOARDING-SPEC.md
- 🔶 Need to update: ANALYSIS-SUMMARY.md

---

**Next Steps**:
1. Review UPDATED-IMPLEMENTATION-NOTES.md (this file)
2. Use updated IMMEDIATE-ACTION-ITEMS.md for implementation
3. Start with Day 1 (single Dockerfile + version detection)
4. Coordinate with framework team on version filtering support

**Status**: ✅ Architecture clarifications complete, ready to implement

