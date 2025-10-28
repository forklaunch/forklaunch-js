# Release & Deploy Implementation Plan

## Overview

Implement CLI commands to package and deploy ForkLaunch applications. The platform already handles 80% of the complexity (environment variables, secrets, observability, defaults), and **the framework already has OpenAPI export support**, so we just need simple CLI commands.

**Timeline**: 3-4 weeks (faster than expected!)
**Effort**: ~2.5-3 weeks CLI + 1-2 weeks platform enhancements

**Bonus**: Framework already supports `FORKLAUNCH_MODE=openapi` for exporting OpenAPI specs without starting the server! 🎉

### CLI Commands to Implement

1. **`forklaunch integrate`** - Link local app to platform (or create new)
2. **`forklaunch openapi export`** - Extract OpenAPI specs to files
3. **`forklaunch release create`** - Package and upload release to S3
4. **`forklaunch deploy create`** - Trigger platform-managed deployment

### Free Tier First Philosophy

All deployment defaults use **AWS Free Tier** resources to keep costs at **$0/month** for development and small production workloads:

- **Compute**: 256m CPU, 512Mi RAM per service/worker (Fargate free tier)
- **Database**: db.t3.micro, 20GB storage (750 hours/month free)
- **Cache**: cache.t3.micro, single node (free tier eligible)
- **Scaling**: 1-2 replicas (keeps within free tier limits)

**Users can upgrade** via Platform UI when their application grows. See [Service Deployment Defaults](adding-projects/services.md#deployment-defaults) and [Worker Deployment Defaults](adding-projects/workers.md#deployment-defaults) for details.

---

## What Platform Already Provides

| Feature | Status | Details |
|---------|--------|---------|
| Environment Variables | ✅ Complete | Managed via Platform API, encrypted per env/region |
| Secrets Management | ✅ Complete | EncryptionService, never in CLI/git |
| OTEL Config | ✅ Complete | Auto-configured, endpoint provided by platform |
| Release Entities | ✅ Complete | `Release` entity, S3 storage structure defined |
| Deployment Tracking | ✅ Complete | `DeploymentState` entity |
| Sensible Defaults | ✅ Complete | All services have defaults (VERSION, DOCS_PATH, etc.) |
| Infrastructure Provisioning | 🚧 80% Done | Pulumi generator exists, needs default enhancements |

**Key Insight**: We don't need complex configuration. Platform provides intelligent defaults for everything.

---

## Implementation Tasks

### Phase 0: Integrate Command (1 day)

**Command**: `forklaunch integrate --app <id>`

**Purpose**: Link local application to deployed platform application for release/deploy commands.

**What It Does**:
1. Validates application ID exists on platform (API call)
2. Updates `.forklaunch/manifest.toml` with platform application ID
3. Optionally fetches application metadata from platform
4. Confirms integration successful

**Implementation**:
```rust
// cli/src/integrate/mod.rs
pub fn integrate_application(
    application_id: String,
    manifest_path: &Path,
) -> Result<()> {
    // 1. Validate application exists on platform
    let token = get_auth_token()?;
    let app_metadata = platform_api::get_application(&token, &application_id)?;
    
    println!("Found application: {}", app_metadata.name);
    
    // 2. Read current manifest
    let mut manifest = read_manifest(manifest_path)?;
    
    // 3. Update with platform application ID
    manifest.platform_application_id = Some(application_id.clone());
    
    // 4. Optionally sync other metadata
    if confirm("Sync application name from platform?")? {
        manifest.app_name = app_metadata.name;
    }
    
    // 5. Write updated manifest
    write_manifest(manifest_path, &manifest)?;
    
    println!("✓ Application integrated successfully!");
    println!("  Platform App ID: {}", application_id);
    println!("  Application Name: {}", app_metadata.name);
    println!("\nYou can now use:");
    println!("  forklaunch release create --version <version>");
    println!("  forklaunch deploy create --release <version> --environment <env> --region <region>");
    
    Ok(())
}
```

**Manifest Changes**:
```toml
# .forklaunch/manifest.toml

# NEW: Platform integration
[platform]
application_id = "550e8400-e29b-41d4-a716-446655440000"
organization_id = "org-123"  # Optional, from platform
last_synced = "2024-10-15T10:30:00Z"  # Last sync timestamp
```

See [example-manifest-with-platform.toml](example-manifest-with-platform.toml) for a complete example.

**Usage Examples**:
```bash
# Link to platform application (basic)
forklaunch integrate --app e1d113dc-cb1e-4b33-bb92-4657d3e0ce3d

# With custom path
forklaunch integrate --app e1d113dc-cb1e-4b33-bb92-4657d3e0ce3d --path ./my-app
```

**Files to Create**:
- `cli/src/integrate.rs`
- Add `IntegrateCommand` to `cli/src/main.rs`

**Manifest Schema Update** (`cli/src/core/manifest/application.rs`):
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ApplicationManifestData {
    // ... existing fields ...
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<PlatformIntegration>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PlatformIntegration {
    pub application_id: String,
    pub organization_id: Option<String>,
    pub last_synced: Option<String>,  // ISO 8601 timestamp
}
```

**Usage in Other Commands**:
```rust
// cli/src/release/create.rs
pub fn create_release(...) -> Result<()> {
    let manifest = read_manifest(manifest_path)?;
    
    // Get platform application ID
    let app_id = manifest.platform
        .as_ref()
        .ok_or(anyhow::anyhow!(
            "Application not integrated. Run: forklaunch integrate --application-id <id>"
        ))?
        .application_id
        .clone();
    
    // Use app_id in platform API calls
    platform_api::create_release(&token, &app_id, release_manifest)?;
    
    Ok(())
}
```

**Testing**:
```bash
# Link to existing application
forklaunch integrate --app e1d113dc-cb1e-4b33-bb92-4657d3e0ce3d

# Verify manifest updated
cat .forklaunch/manifest.toml
# Should have platform_application_id and platform_organization_id fields
```

---

### Phase 1: OpenAPI Export Command (1-2 days)

**Command**: `forklaunch openapi export`

**Purpose**: Extract runtime-generated OpenAPI specs to files for release packaging.

**Framework Support** (✅ Already Implemented!):
The framework already supports OpenAPI export mode in `expressApplication.ts` (lines 135-148):

```typescript
// framework/express/src/expressApplication.ts
if (process.env.FORKLAUNCH_MODE === 'openapi') {
  const openApiSpec = generateOpenApiSpecs<SV>(
    this.schemaValidator,
    [],
    [],
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

**How It Works**:
- Set `FORKLAUNCH_MODE=openapi` environment variable
- Set `FORKLAUNCH_OPENAPI_OUTPUT=path/to/file.json`
- Run service (e.g., `npm run dev`)
- Framework generates OpenAPI and writes to file
- Process exits immediately (no server startup)

**CLI Implementation** (very simple!):
```rust
// cli/src/openapi/export.rs
pub fn export_openapi_specs(manifest_path: &Path) -> Result<()> {
    // 1. Read manifest to get services
    let manifest = read_manifest(manifest_path)?;
    
    // 2. Create output directory
    fs::create_dir_all("dist")?;
    
    // 3. For each service:
    for service in manifest.projects.iter().filter(|p| p.r#type == ProjectType::Service) {
        let service_path = Path::new(&manifest.modules_path).join(&service.name);
        let output_path = format!("dist/{}/openapi.json", service.name);
        
        // Create service dist directory
        fs::create_dir_all(format!("dist/{}", service.name))?;
        
        // 4. Run service in export mode
        let status = Command::new("npm")
            .args(&["run", "dev"])
            .current_dir(&service_path)
            .env("FORKLAUNCH_MODE", "openapi")
            .env("FORKLAUNCH_OPENAPI_OUTPUT", &output_path)
            .status()?;
        
        if !status.success() {
            return Err(anyhow::anyhow!("Failed to export OpenAPI for {}", service.name));
        }
        
        println!("✓ Exported OpenAPI for {}", service.name);
    }
    
    Ok(())
}
```

**Benefits**:
- ✅ **Already implemented** in framework (no framework changes needed!)
- ✅ No server startup (exits immediately)
- ✅ No HTTP requests or health checks
- ✅ No port conflicts
- ✅ Very fast (seconds, not minutes)
- ✅ Simple CLI code (just run command with env vars)

**Files to Create**:
- `cli/src/openapi/mod.rs`
- `cli/src/openapi/export.rs`
- Add `OpenApiCommand` to `cli/src/main.rs`

**Framework Changes**:
- ✅ **None needed!** Already implemented in both Express and Hyper-Express
  - Express: `framework/express/src/expressApplication.ts` (lines 135-148)
  - Hyper-Express: `framework/hyper-express/src/hyperExpressApplication.ts` (lines 166-177)

**Testing**:
```bash
cd test-app

# Test framework mode directly
cd blueprint/iam-base
FORKLAUNCH_MODE=openapi FORKLAUNCH_OPENAPI_OUTPUT=test-openapi.json npm run dev
# Should create test-openapi.json and exit

# Test CLI command
cd ../..
forklaunch openapi export
# ✓ Exported OpenAPI for iam-base
# ✓ Exported OpenAPI for billing-base
# Should create dist/iam-base/openapi.json, dist/billing-base/openapi.json
```

---

### Phase 2: Release Create Command (5-7 days)

**Command**: `forklaunch release create --version <version> [--notes <notes>]`

**Purpose**: Package code and upload minimal release manifest to S3.

**What It Does**:
1. Auto-detect git commit/branch (`git rev-parse HEAD`, `git branch --show-current`)
2. Read `.forklaunch/manifest.toml`
3. Call `openapi export` internally
4. Collect Dockerfiles from service/worker directories
5. Generate minimal release manifest (JSON)
6. Upload to S3 via Platform API
7. Call Platform API to create Release entity
8. Update local manifest with current version

**Release Manifest Structure** (minimal):
```json
{
  "version": "1.2.3",
  "gitCommit": "abc123def",
  "gitBranch": "main",
  "timestamp": "2024-10-15T10:30:00Z",
  "services": [
    {
      "id": "iam-base",
      "name": "iam-base",
      "type": "api",
      "config": {
        "controllers": [...],        // From OpenAPI spec
        "openApiSpec": {...}         // Full OpenAPI 3.1
      }
    }
  ],
  "infrastructure": {
    "regions": ["us-east-1"],        // From manifest or default
    "cloudProvider": "aws",          // From manifest or default
    "resources": [
      { "id": "main-db", "type": "postgresql" }  // Just types, platform fills rest
    ]
  },
  "requiredEnvironmentVariables": [
    "DATABASE_URL",
    "OTEL_SERVICE_NAME",
    "OTEL_EXPORTER_OTLP_ENDPOINT"
  ]
}
```

**Implementation**:
```rust
// cli/src/release/create.rs
pub fn create_release(
    version: String,
    notes: Option<String>,
    manifest_path: &Path,
) -> Result<()> {
    // 1. Validate git repo
    let git_commit = run_command("git", &["rev-parse", "HEAD"])?;
    let git_branch = run_command("git", &["branch", "--show-current"])?;
    
    // 2. Read manifest
    let manifest = read_manifest(manifest_path)?;
    
    // 3. Export OpenAPI specs
    export_openapi_specs(manifest_path)?;
    
    // 4. Build release manifest
    let release_manifest = build_release_manifest(
        version,
        git_commit,
        git_branch,
        &manifest
    )?;
    
    // 5. Collect artifacts
    let artifacts = collect_artifacts(&manifest)?;
    
    // 6. Upload to S3 via Platform API
    upload_release(release_manifest, artifacts)?;
    
    // 7. Update local manifest
    update_manifest_version(manifest_path, version)?;
    
    Ok(())
}
```

**Files to Create**:
- `cli/src/release/mod.rs`
- `cli/src/release/create.rs`
- `cli/src/release/manifest_generator.rs`
- `cli/src/release/uploader.rs`
- Add `ReleaseCommand` to `cli/src/main.rs`

**Dependencies to Add** (`cli/Cargo.toml`):
```toml
[dependencies]
reqwest = { version = "0.11", features = ["json", "rustls-tls"] }
tokio = { version = "1.0", features = ["full"] }
serde_json = "1.0"
```

**Testing**:
```bash
cd test-app
forklaunch release create --version 1.0.0 --notes "Initial release"
# Should upload to S3 and create release record
```

---

### Phase 3: Deploy Create Command (3-5 days)

**Command**: `forklaunch deploy create --release <version> --environment <env> --region <region>`

**Purpose**: Trigger platform-managed deployment.

**What It Does**:
1. Authenticate using existing `login` token
2. Call Platform API:
   ```
   POST /v1/deployments
   {
     "applicationId": "app-123",
     "releaseVersion": "1.2.3",
     "environment": "production",
     "region": "us-east-1"
   }
   ```
3. Platform executes deployment (server-side)
4. CLI streams deployment status
5. Display results

**Implementation**:
```rust
// cli/src/deploy/create.rs
pub fn create_deployment(
    release_version: String,
    environment: String,
    region: String,
) -> Result<()> {
    // 1. Get auth token
    let token = get_auth_token()?;
    
    // 2. Get application ID from manifest
    let app_id = read_app_id_from_manifest()?;
    
    // 3. Call Platform API
    let deployment_id = platform_api::create_deployment(
        &token,
        &app_id,
        &release_version,
        &environment,
        &region,
    )?;
    
    // 4. Stream deployment status
    stream_deployment_status(&token, &deployment_id)?;
    
    // 5. Show results
    show_deployment_results(&token, &deployment_id)?;
    
    Ok(())
}

fn stream_deployment_status(token: &str, deployment_id: &str) -> Result<()> {
    // WebSocket or HTTP polling
    println!("⊙ Creating deployment...");
    
    loop {
        let status = platform_api::get_deployment_status(token, deployment_id)?;
        
        match status.phase {
            "provisioning_database" => println!("✓ Provisioning database..."),
            "creating_load_balancer" => println!("✓ Creating load balancer..."),
            "deploying_services" => println!("✓ Deploying services..."),
            "completed" => {
                println!("\nDeployment successful! 🎉");
                println!("API: {}", status.endpoints.api);
                println!("Docs: {}", status.endpoints.docs);
                break;
            },
            "failed" => {
                println!("\n❌ Deployment failed:");
                println!("{}", status.error);
                return Err(anyhow::anyhow!("Deployment failed"));
            },
            _ => {}
        }
        
        std::thread::sleep(Duration::from_secs(2));
    }
    
    Ok(())
}
```

**Files to Create**:
- `cli/src/deploy/mod.rs`
- `cli/src/deploy/create.rs`
- `cli/src/deploy/status_stream.rs`
- `cli/src/core/platform_api.rs` (if doesn't exist)
- Add `DeployCommand` to `cli/src/main.rs`

**Testing**:
```bash
# After setting env vars in Platform UI
forklaunch deploy create --release 1.0.0 --environment staging --region us-east-1
```

---

### Phase 4: Manifest Extensions (1-2 days)

**Optional Fields to Add** (all backward-compatible):

```toml
# .forklaunch/manifest.toml

# NEW OPTIONAL: Deployment preferences
[deployment]
cloud_provider = "aws"              # Default: "aws"
default_regions = ["us-east-1"]     # Default: ["us-east-1"]

# NEW OPTIONAL: Release tracking (auto-populated by CLI)
[release]
current_version = "1.0.0"
git_commit = "abc123"
git_branch = "main"

# NEW OPTIONAL: Resource hints (minimal)
[[infrastructure.resources]]
id = "main-db"
type = "postgresql"                 # Platform chooses instance size, etc.
```

**Implementation**:
Update `cli/src/core/manifest/application.rs`:
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ApplicationManifestData {
    // ... existing fields ...
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deployment: Option<DeploymentConfig>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release: Option<ReleaseInfo>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub infrastructure: Option<InfrastructureConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeploymentConfig {
    #[serde(default = "default_cloud_provider")]
    pub cloud_provider: String,
    #[serde(default = "default_regions")]
    pub default_regions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReleaseInfo {
    pub current_version: Option<String>,
    pub git_commit: Option<String>,
    pub git_branch: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InfrastructureConfig {
    pub resources: Vec<ResourceHint>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceHint {
    pub id: String,
    pub r#type: String,  // "postgresql", "redis", etc.
}

fn default_cloud_provider() -> String {
    "aws".to_string()
}

fn default_regions() -> Vec<String> {
    vec!["us-east-1".to_string()]
}
```

---

### Phase 5: Platform Enhancements (1-2 weeks, parallel)

**Enhance Pulumi Generator with Intelligent Defaults**:

Location: `forklaunch-platform/src/modules/pulumi-generator/`

**Changes Needed**:

1. **Auto-inject Platform URLs**:
```typescript
// When generating environment variables
const platformVars = {
  OTEL_SERVICE_NAME: service.name,
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4318",
  OTEL_LEVEL: "info",
  S3_REGION: deployment.region,
  S3_URL: getPlatformS3Endpoint(deployment.region),
  PROTOCOL: "https",
  HOST: `${service.name}.${deployment.environment}.forklaunch.io`,
  PORT: "3000",
  VERSION: "/v1",
  DOCS_PATH: "/docs",
};
```

2. **Free Tier Defaults** (cost-optimized):
```typescript
// Database defaults - FREE TIER eligible
const databaseDefaults = {
  postgresql: {
    instanceClass: "db.t3.micro",      // Free tier: 750 hours/month
    allocatedStorage: 20,               // Free tier: 20GB
    maxAllocatedStorage: 20,
    multiAZ: false,                     // Single AZ for free tier
    backupRetentionPeriod: 7,
    storageEncrypted: true,
    performanceInsightsEnabled: false,  // Not in free tier
  },
  redis: {
    nodeType: "cache.t3.micro",        // Free tier eligible
    numCacheNodes: 1,                   // Single node for free tier
    snapshotRetentionLimit: 1,
    atRestEncryptionEnabled: false,     // Not in free tier
    transitEncryptionEnabled: false,    // Not in free tier
  }
};

// Service defaults - FREE TIER eligible
const serviceDefaults = {
  cpu: "256m",                          // 0.25 vCPU (Fargate free tier)
  memory: "512Mi",                      // 0.5 GB (Fargate free tier)
  replicas: { min: 1, max: 2 },         // Free tier: limited replicas
  healthCheck: {
    path: "/health",
    interval: 30,
    timeout: 5,
  }
};

// Note: Users can upgrade via Platform UI when needed
```

3. **Auto-generate Infrastructure**:
```typescript
// If user doesn't specify VPC, create sensible one
const generateVPC = (region: string) => {
  return new aws.ec2.Vpc("app-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: `${appName}-vpc`, ManagedBy: "forklaunch" },
  });
};

// Auto-create load balancer
const generateLoadBalancer = (vpc: aws.ec2.Vpc, services: Service[]) => {
  const alb = new aws.lb.LoadBalancer("app-lb", {
    loadBalancerType: "application",
    subnets: publicSubnetIds,
    securityGroups: [lbSecurityGroupId],
  });
  
  // Auto-configure listeners, target groups, etc.
};
```

**Testing**:
- Deploy test app with minimal manifest
- Verify all defaults are applied
- Check generated infrastructure

---

## CLI Command Reference

### forklaunch integrate
```bash
forklaunch integrate --app <application-id> [options]

Options:
  -a, --app <id>          Platform application ID to link to (required)
  -p, --path <path>       Path to application root (optional)
  
Examples:
  # Link to platform application
  forklaunch integrate --app e1d113dc-cb1e-4b33-bb92-4657d3e0ce3d
  
  # With custom path
  forklaunch integrate --app e1d113dc-cb1e-4b33-bb92-4657d3e0ce3d --path ./my-app
```

### forklaunch openapi export
```bash
forklaunch openapi export [--output <dir>]

Options:
  --output <dir>    Output directory (default: dist)
  
Example:
  forklaunch openapi export
```

### forklaunch release create
```bash
forklaunch release create --version <version> [options]

Options:
  --version <version>   Semantic version (required)
  --notes <notes>       Release notes (optional)
  --dry-run            Simulate without uploading
  
Examples:
  forklaunch release create --version 1.0.0
  forklaunch release create --version 1.2.3 --notes "Added analytics"
```

### forklaunch deploy create
```bash
forklaunch deploy create --release <version> --environment <env> --region <region> [options]

Options:
  --release <version>      Release version to deploy (required)
  --environment <env>      Environment name (required)
  --region <region>        AWS region (required)
  --wait                   Wait for deployment to complete (default: true)
  --stream-logs            Stream deployment logs (default: true)
  
Examples:
  forklaunch deploy create --release 1.0.0 --environment staging --region us-east-1
  forklaunch deploy create --release 1.0.0 --environment production --region us-east-1
```

---

## User Workflow

### First-Time Deployment

```bash
# 1. Initialize app (existing command)
forklaunch init application my-app --database postgresql --services iam
cd my-app

# 2. Develop locally (existing workflow)
npm run dev
# ... write code ...

# 3. Integrate with platform (NEW)
# First, create application via Platform UI or API, then:
forklaunch integrate --app e1d113dc-cb1e-4b33-bb92-4657d3e0ce3d
# 
# ✓ Found application: my-app
# ✓ Application integrated successfully!
# ✓ Manifest updated

# 4. Create release (NEW)
forklaunch release create --version 1.0.0
# ✓ Git detected: abc123 (main)
# ✓ OpenAPI exported: 1 service
# ✓ Dockerfiles collected
# ✓ Manifest generated
# ✓ Uploaded to S3
# ✓ Release 1.0.0 created

# 4. Set environment variables (Platform UI)
# Browser: https://platform.forklaunch.io/apps/my-app/settings
# Add:
#   DATABASE_URL = postgresql://...
#   JWT_SECRET = ...

# 5. Deploy (NEW)
forklaunch deploy create --release 1.0.0 --environment production --region us-east-1
# ⊙ Creating deployment...
# ✓ Provisioning database (RDS PostgreSQL db.t3.micro, 20GB, Free Tier)
# ✓ Creating load balancer (ALB with auto-SSL)
# ✓ Deploying iam-base service (1 replica, 256m CPU, 512Mi RAM, Free Tier)
# ✓ Configuring auto-scaling (1-2 replicas)
# ✓ Configuring monitoring (OTEL, Prometheus, Grafana)
# 
# Deployment successful! 🎉
# API: https://my-app.production.forklaunch.io
# Docs: https://my-app.production.forklaunch.io/docs
# Monitoring: https://platform.forklaunch.io/apps/my-app/metrics
# 
# 💰 Cost: $0/month (AWS Free Tier)
# 📈 Upgrade resources anytime via Platform UI
```

### Multi-Region Deployment

```bash
# Same release to multiple regions
forklaunch deploy create --release 1.0.0 --environment production --region us-east-1
forklaunch deploy create --release 1.0.0 --environment production --region eu-west-1
forklaunch deploy create --release 1.0.0 --environment production --region ap-southeast-1
```

---

## Testing Strategy

### Unit Tests
```rust
// cli/src/release/__tests__/manifest_generator.rs
#[test]
fn test_generate_minimal_manifest() {
    let manifest = generate_release_manifest(...);
    assert!(manifest.version == "1.0.0");
    assert!(manifest.services.len() > 0);
    assert!(manifest.infrastructure.resources.len() > 0);
}
```

### Integration Tests
```bash
# cli/tests/release_create_test.sh
#!/bin/bash
cd test-fixtures/sample-app
forklaunch release create --version 0.0.1 --dry-run
# Verify manifest generated correctly
```

### E2E Tests
```bash
# Full workflow test
forklaunch init application test-app --database postgresql
cd test-app
forklaunch release create --version 1.0.0
# (Set env vars via API)
forklaunch deploy create --release 1.0.0 --environment test --region us-east-1
# Verify deployment successful
```

---

## Success Criteria

- [x] Framework supports OpenAPI export mode ✅ **Already done!**
- [ ] `forklaunch integrate` links local app to platform application
- [ ] `forklaunch integrate --create` creates new platform application
- [ ] `forklaunch integrate` (interactive) lists and selects applications
- [ ] `forklaunch openapi export` successfully extracts OpenAPI specs
- [ ] `forklaunch release create` packages and uploads release
- [ ] `forklaunch deploy create` triggers deployment via Platform API
- [ ] Platform provisions infrastructure with free tier defaults
- [ ] Deployment completes in < 10 minutes
- [ ] Zero infrastructure configuration required
- [ ] Environment variables managed via Platform UI
- [ ] Multiple environments/regions work independently
- [ ] Deployments stay in AWS free tier by default
- [ ] Cost: $0/month for development, $5-15/month for small production
- [ ] Documentation complete with examples

---

## Timeline & Milestones

**Week 1**:
- [x] Framework OpenAPI export mode ✅ **Already implemented!**
- [ ] Day 1: Manifest extensions (add platform integration fields)
- [ ] Day 2: Integrate command (link to platform application)
- [ ] Day 3-4: CLI OpenAPI export command
- [ ] Day 5: Testing OpenAPI export, start Release create

**Week 2**:
- [ ] Day 1-5: Release create command

**Week 3**:
- [ ] Day 1-3: Deploy create command
- [ ] Day 4-5: E2E testing & bug fixes

**Week 4-5** (parallel with weeks 2-3):
- [ ] Platform enhancements
- [ ] Free tier default configurations
- [ ] Auto-injection logic for platform URLs

**Week 6**:
- [ ] Documentation and examples
- [ ] Beta testing
- [ ] Beta release

---

## Notes

- **Integration**: Run `forklaunch integrate` before release/deploy to link manifest to platform application
- **Security**: Never put secrets in manifest or CLI. Always via Platform UI/API.
- **Defaults**: Platform provides free tier best practices. 95% of users won't need overrides.
- **Simplicity**: Optimize for developer experience, not configurability.
- **Progressive**: Start simple, add complexity only when needed.
- **Cost**: Free tier defaults keep development at $0/month.

