# Updated Implementation Notes - Architecture Clarifications

**Date**: 2024-10-17  
**Status**: Important architectural clarifications from user

---

## 🔄 Architecture Updates

### 1. OpenAPI Structure (Multi-Version per Service)

**Previous Understanding**:
```json
{
  "services": {
    "iam-base": {
      "openapi.json": { ... }  // Single OpenAPI spec
    }
  }
}
```

**Actual Architecture**:
```json
{
  "services": {
    "iam-base": {
      "openapi": {
        "v1": { /* OpenAPI 3.1 document */ },
        "v2": { /* OpenAPI 3.1 document */ }
      }
    }
  }
}
```

**Key Insight**: A service can have **multiple API versions** (v1, v2, v3, etc.). The platform should:
- Read routes from ALL versions in the OpenAPI specs
- Create separate route records per version
- Support versioned API endpoints

### 2. Dockerfile Structure (Single Monorepo Dockerfile)

**Previous Understanding**:
```
releases/{version}/artifacts/
├── services/
│   ├── iam-base/
│   │   └── Dockerfile      ❌ One per service
│   └── billing-base/
│       └── Dockerfile      ❌ One per service
└── workers/
    └── email-worker/
        └── Dockerfile      ❌ One per worker
```

**Actual Architecture**:
```
releases/{version}/artifacts/
├── Dockerfile              ✅ Single Dockerfile for all
└── services/
    ├── iam-base/
    │   └── openapi/        (versions)
    └── billing-base/
        └── openapi/        (versions)
```

**Key Insight**: This is a **monorepo pattern** where:
- One Dockerfile builds all services and workers
- Services/workers are differentiated by start command, not by Dockerfile
- Simpler upload and storage structure

---

## 📝 Updated S3 Folder Structure

```
s3://forklaunch-platform/applications/{applicationId}/releases/{version}/
├── manifest.json                        # Release manifest
├── Dockerfile                           # ✅ Single Dockerfile
└── artifacts/
    ├── services/
    │   ├── {serviceId}/
    │   │   ├── openapi/
    │   │   │   ├── v1.json             # ✅ Version-specific OpenAPI
    │   │   │   ├── v2.json             # ✅ Version-specific OpenAPI
    │   │   │   └── v3.json             # ✅ etc.
    │   │   └── config.json             # Service config
    │   └── ...
    └── workers/
        └── {workerId}/
            └── config.json             # Worker config
```

**No Dockerfiles in service/worker directories** - just one at the root.

---

## 🔧 Updated CLI Implementation

### 1. OpenAPI Collection (Multiple Versions per Service)

**Current Implementation** (`cli/src/core/openapi_export.rs`):
```rust
// Currently exports to: dist/{service}/openapi.json
```

**Needs to Support**:
```rust
// Should export to: dist/{service}/openapi/{version}.json

pub fn export_all_services(
    app_root: &Path,
    manifest: &ApplicationManifestData,
    dist_path: &Path,
) -> Result<Vec<String>> {
    let mut exported = Vec::new();
    let modules_path = app_root.join(&manifest.modules_path);
    
    for project in &manifest.projects {
        if project.r#type != ProjectType::Service {
            continue;
        }
        
        let service_path = modules_path.join(&project.name);
        let service_dist = dist_path.join(&project.name).join("openapi");
        fs::create_dir_all(&service_dist)?;
        
        // Export for each API version
        let versions = detect_api_versions(&service_path)?; // ["v1", "v2"]
        
        for version in versions {
            let output_path = service_dist.join(format!("{}.json", version));
            
            let status = Command::new("npm")
                .args(&["run", "dev"])
                .current_dir(&service_path)
                .env("FORKLAUNCH_MODE", "openapi")
                .env("FORKLAUNCH_OPENAPI_VERSION", &version)  // NEW
                .env("FORKLAUNCH_OPENAPI_OUTPUT", &output_path)
                .status()?;
            
            if !status.success() {
                bail!("Failed to export OpenAPI for {} ({})", project.name, version);
            }
        }
        
        exported.push(project.name.clone());
    }
    
    Ok(exported)
}

fn detect_api_versions(service_path: &Path) -> Result<Vec<String>> {
    // Check server.ts or registrations.ts for API versions
    // For now, default to ["v1"]
    Ok(vec!["v1".to_string()])
}
```

### 2. Dockerfile Collection (Single File)

**Updated Implementation**:
```rust
fn collect_dockerfile(app_root: &Path) -> Result<String> {
    let dockerfile_path = app_root.join("Dockerfile");
    
    if !dockerfile_path.exists() {
        bail!("Missing Dockerfile at {}", dockerfile_path.display());
    }
    
    let content = read_to_string(&dockerfile_path)
        .with_context(|| "Failed to read Dockerfile")?;
    
    // Validate no secrets
    if contains_potential_secrets(&content) {
        bail!("Dockerfile may contain secrets. Please use ARG/ENV instead.");
    }
    
    Ok(content)
}
```

### 3. Updated Release Request

```rust
#[derive(Debug, Serialize)]
struct CreateReleaseRequest {
    #[serde(rename = "applicationId")]
    application_id: String,
    manifest: ReleaseManifest,
    
    // ✅ Single Dockerfile (not per-service)
    dockerfile: String,
    
    // ✅ OpenAPI specs with versions
    #[serde(rename = "openapiSpecs")]
    openapi_specs: HashMap<String, HashMap<String, Value>>,
    // Structure: { "iam-base": { "v1": {...}, "v2": {...} } }
    
    #[serde(rename = "buildConfigs")]
    build_configs: HashMap<String, BuildConfig>,
    
    #[serde(rename = "releasedBy", skip_serializing_if = "Option::is_none")]
    released_by: Option<String>,
}
```

### 4. Updated Manifest Generator

```rust
// cli/src/release/manifest_generator.rs

pub(crate) fn generate_release_manifest(
    version: String,
    git_commit: String,
    git_branch: Option<String>,
    manifest: &ApplicationManifestData,
    openapi_specs: &HashMap<String, HashMap<String, Value>>, // ✅ Changed
    required_env_vars: Vec<EnvironmentVariableRequirement>,
    project_runtime_deps: &HashMap<String, Vec<String>>,
) -> Result<ReleaseManifest> {
    // ... existing code ...
    
    let mut services = Vec::new();
    for project in &manifest.projects {
        if project.r#type == ProjectType::Service {
            // Get all versions for this service
            let service_openapi = openapi_specs.get(&project.name);
            
            services.push(ServiceDefinition {
                id: project.name.clone(),
                name: project.name.clone(),
                service_type: "api".to_string(),
                config: ServiceConfig {
                    controllers: None,
                    open_api_spec: service_openapi.cloned(), // ✅ Now a map of versions
                    dependencies: None,
                    runtime_dependencies: runtime_deps,
                },
            });
        }
        // ... workers ...
    }
    
    // ...
}
```

---

## 🏗️ Updated Platform Implementation

### 1. Release API Endpoint Changes

```typescript
// platform-management/api/releases/create.ts

interface CreateReleaseRequest {
  applicationId: string;
  manifest: ReleaseManifest;
  
  // ✅ Single Dockerfile
  dockerfile: string;
  
  // ✅ OpenAPI specs with versions
  openapiSpecs: Record<string, Record<string, OpenAPIDocument>>;
  // Example: { "iam-base": { "v1": {...}, "v2": {...} } }
  
  buildConfigs: Record<string, BuildConfig>;
  releasedBy?: string;
}

async function handleCreateRelease(req: CreateReleaseRequest) {
  // 1. Validate request
  validateRelease(req);
  
  // 2. Store single Dockerfile
  await s3.putObject({
    Key: `applications/${req.applicationId}/releases/${req.manifest.version}/Dockerfile`,
    Body: req.dockerfile,
  });
  
  // 3. Store OpenAPI specs (per service, per version)
  for (const [serviceId, versions] of Object.entries(req.openapiSpecs)) {
    for (const [version, spec] of Object.entries(versions)) {
      await s3.putObject({
        Key: `applications/${req.applicationId}/releases/${req.manifest.version}/artifacts/services/${serviceId}/openapi/${version}.json`,
        Body: JSON.stringify(spec),
      });
    }
  }
  
  // 4. Store build configs
  for (const [serviceId, config] of Object.entries(req.buildConfigs)) {
    await s3.putObject({
      Key: `applications/${req.applicationId}/releases/${req.manifest.version}/artifacts/services/${serviceId}/config.json`,
      Body: JSON.stringify(config),
    });
  }
  
  // 5. Create Release entity
  const release = await releaseRepo.create({
    applicationId: req.applicationId,
    version: req.manifest.version,
    gitCommit: req.manifest.gitCommit,
    gitBranch: req.manifest.gitBranch,
    manifest: req.manifest,
    status: 'active',
  });
  
  // 6. Create Route entities from OpenAPI specs
  await createRoutesFromOpenApiSpecs(release.id, req.openapiSpecs);
  
  return release;
}
```

### 2. Route Creation from OpenAPI (Multi-Version)

```typescript
async function createRoutesFromOpenApiSpecs(
  releaseId: string,
  openapiSpecs: Record<string, Record<string, OpenAPIDocument>>
) {
  const routes: Route[] = [];
  
  for (const [serviceId, versions] of Object.entries(openapiSpecs)) {
    for (const [apiVersion, spec] of Object.entries(versions)) {
      // Extract routes from OpenAPI spec
      for (const [path, pathItem] of Object.entries(spec.paths || {})) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            continue;
          }
          
          routes.push({
            releaseId,
            serviceId,
            apiVersion,              // ✅ Track version
            method: method.toUpperCase(),
            path,
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            tags: operation.tags,
            auth: operation.security ? {
              required: true,
              scopes: extractScopes(operation.security),
            } : undefined,
          });
        }
      }
    }
  }
  
  // Bulk insert routes
  await routeRepo.createMany(routes);
}
```

### 3. Build Configuration (Single Dockerfile)

```typescript
interface BuildConfig {
  build: {
    context: string;           // "."
    dockerfile: string;        // "Dockerfile" (root level)
    target?: string;           // For multi-stage builds
    args?: Record<string, string>;
  };
  image: {
    registry: string;
    repository: string;        // e.g., "my-app/iam-base"
    tag: string;               // Release version
    pullPolicy: string;
  };
  runtime: {
    // ✅ Different start commands per service
    command: string;           // e.g., "node dist/modules/iam-base/server.js"
    workingDir?: string;
  };
}

// When deploying
function generateContainerDefinition(service: Service, buildConfig: BuildConfig) {
  return {
    image: `${buildConfig.image.registry}/${buildConfig.image.repository}:${buildConfig.image.tag}`,
    command: buildConfig.runtime.command.split(' '),  // ✅ Service-specific command
    // ... other container settings
  };
}
```

---

## 🔄 Updated Implementation Steps

### Day 1: Single Dockerfile Upload (SIMPLIFIED)
```rust
// Much simpler now!
stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
write!(stdout, "[INFO] Collecting Dockerfile...")?;
stdout.flush()?;
stdout.reset()?;

let dockerfile = collect_dockerfile(&app_root)?;

stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
writeln!(stdout, " [OK]")?;
stdout.reset()?;
```

### Day 2: Multi-Version OpenAPI Support
```rust
// Need to update OpenAPI export to support versions
stdout.set_color(ColorSpec::new().set_fg(Some(Color::Cyan)))?;
write!(stdout, "[INFO] Exporting OpenAPI specifications...")?;
stdout.flush()?;
stdout.reset()?;

let openapi_specs = export_all_services_with_versions(&app_root, &manifest, &dist_path)?;
// Returns: HashMap<String, HashMap<String, Value>>
//          { "iam-base": { "v1": {...}, "v2": {...} } }

stdout.set_color(ColorSpec::new().set_fg(Some(Color::Green)))?;
writeln!(stdout, " [OK] ({} services)", openapi_specs.len())?;
stdout.reset()?;
```

### Day 3: Build Configs with Runtime Commands
```rust
pub fn generate_build_configs(
    app_name: &str,
    version: &str,
    manifest: &ApplicationManifestData,
) -> HashMap<String, BuildConfig> {
    let mut configs = HashMap::new();
    
    for project in &manifest.projects {
        let command = match project.r#type {
            ProjectType::Service => {
                format!("node dist/modules/{}/server.js", project.name)
            },
            ProjectType::Worker => {
                format!("node dist/modules/{}/worker.js", project.name)
            },
            _ => continue,
        };
        
        let config = BuildConfig {
            build: BuildSettings {
                context: ".".to_string(),
                dockerfile: "Dockerfile".to_string(),  // ✅ Root level
                target: None,
                args: None,
            },
            image: ImageSettings {
                registry: "registry.forklaunch.io".to_string(),
                repository: format!("{}/{}", app_name, project.name),
                tag: version.to_string(),
                pull_policy: "IfNotPresent".to_string(),
            },
            runtime: RuntimeSettings {
                command,  // ✅ Service-specific command
                working_dir: Some("/app".to_string()),
            },
        };
        
        configs.insert(project.name.clone(), config);
    }
    
    configs
}
```

---

## 📊 Updated Alignment

### Before Understanding
```
Dockerfile Upload    0%  ━━━━━━━━━━  Need per-service collection
OpenAPI Upload       0%  ━━━━━━━━━━  Need single version per service
```

### After Clarifications
```
Dockerfile Upload    0%  ━━━━━━━━━━  SIMPLER: Just one file
OpenAPI Upload       0%  ━━━━━━━━━━  MORE COMPLEX: Multi-version support
```

**Net Result**: Same effort, but different complexity distribution.

---

## 🎯 Updated Priority

### High Priority
1. **Multi-Version OpenAPI Support** (1 day)
   - Update framework to export per version
   - Update CLI to collect all versions
   - Update Platform to create routes per version

2. **Single Dockerfile Upload** (0.5 day) - EASIER NOW
   - Just read one file from root
   - No per-service collection needed

### Medium Priority
3. **Build Config with Runtime Commands** (1 day)
   - Add runtime.command to BuildConfig
   - Platform uses correct start command per service

---

## 💡 Key Benefits of This Architecture

### Single Dockerfile (Monorepo Pattern)
✅ **Simpler deployment** - One build produces all services  
✅ **Consistent dependencies** - All services use same base  
✅ **Faster builds** - Share layers across services  
✅ **Easier maintenance** - One Dockerfile to update  

### Multi-Version OpenAPI (Versioned APIs)
✅ **API evolution** - Support v1, v2, v3 simultaneously  
✅ **Gradual migration** - Clients can upgrade at their pace  
✅ **Better tracking** - Know which routes belong to which version  
✅ **Deprecation management** - Remove old versions cleanly  

---

## 🔧 Framework Changes Needed

The framework needs to support exporting specific API versions:

```typescript
// framework/express/src/expressApplication.ts

if (process.env.FORKLAUNCH_MODE === 'openapi') {
  const version = process.env.FORKLAUNCH_OPENAPI_VERSION || 'v1';
  
  // Filter routes by version
  const versionedRoutes = this.routes.filter(route => 
    route.path.startsWith(`/${version}/`)
  );
  
  const openApiSpec = generateOpenApiSpecs<SV>(
    this.schemaValidator,
    [],
    versionedRoutes,  // ✅ Only include routes for this version
    this,
    this.openapiConfiguration
  );
  
  fs.writeFileSync(
    process.env.FORKLAUNCH_OPENAPI_OUTPUT as string,
    JSON.stringify(openApiSpec, null, 2)
  );
  
  process.exit(0);
}
```

---

## 📝 Updated Example Release Package

```json
POST /releases
{
  "applicationId": "app-123",
  "manifest": {
    "version": "1.0.0",
    "gitCommit": "abc123",
    "services": [
      {
        "id": "iam-base",
        "name": "iam-base",
        "type": "api",
        "config": {
          "openApiSpec": {
            "v1": { /* OpenAPI 3.1 */ },
            "v2": { /* OpenAPI 3.1 */ }
          }
        }
      }
    ]
  },
  
  // ✅ Single Dockerfile
  "dockerfile": "FROM node:20-alpine\nWORKDIR /app\n...",
  
  // ✅ OpenAPI with versions (also in manifest, but complete here)
  "openapiSpecs": {
    "iam-base": {
      "v1": { /* Full OpenAPI document */ },
      "v2": { /* Full OpenAPI document */ }
    },
    "billing-base": {
      "v1": { /* Full OpenAPI document */ }
    }
  },
  
  // ✅ Build configs with runtime commands
  "buildConfigs": {
    "iam-base": {
      "build": {
        "context": ".",
        "dockerfile": "Dockerfile"
      },
      "image": {
        "registry": "registry.forklaunch.io",
        "repository": "my-app/iam-base",
        "tag": "1.0.0"
      },
      "runtime": {
        "command": "node dist/modules/iam-base/server.js"
      }
    }
  }
}
```

---

## ✅ Updated Checklist

### CLI Changes
- [ ] Update `collect_dockerfile()` to read from root (simpler)
- [ ] Add `detect_api_versions()` function
- [ ] Update `export_all_services()` to support versions
- [ ] Update `ReleaseManifest` types for versioned OpenAPI
- [ ] Add `runtime.command` to BuildConfig
- [ ] Update CreateReleaseRequest structure

### Framework Changes
- [ ] Support `FORKLAUNCH_OPENAPI_VERSION` env var
- [ ] Filter routes by version when exporting
- [ ] Ensure version prefixes work (e.g., `/v1/users`, `/v2/users`)

### Platform Changes
- [ ] Accept single `dockerfile` field (not per-service)
- [ ] Accept `openapiSpecs` with versions
- [ ] Store OpenAPI specs at `services/{id}/openapi/{version}.json`
- [ ] Create Route entities per version
- [ ] Use `runtime.command` for container definitions

---

## 🚀 Summary

**Simpler**: Single Dockerfile (not per-service)  
**More Complex**: Multi-version OpenAPI (not single version)  
**Net Result**: About the same effort, just different focus

**Updated Timeline**: Still 3 days, but:
- Day 1: Single Dockerfile (easy) + Multi-version detection (medium)
- Day 2: Multi-version OpenAPI export (medium-hard)
- Day 3: Build configs with runtime commands (easy) + docs

---

**Status**: Ready to implement with correct architecture understanding ✅

