# Resource Provisioning Flow

## Complete Flow from CLI → Platform → Pulumi → AWS

### Step 1: CLI Reads Manifest
```toml
# .forklaunch/manifest.toml
[[projects]]
type = "Service"
name = "platform-management"

[projects.resources]
database = "postgresql"  # ← SPECIFIC TYPE
cache = "redis"
```

### Step 2: CLI Generates Release Manifest
```typescript
// forklaunch release create --version 1.0.0

// CLI reads manifest and generates:
{
  "infrastructure": {
    "regions": ["us-east-1"],
    "resources": [
      {
        "id": "platform-management-db",
        "type": "postgresql",  // ← Used by Pulumi Generator
        "name": "platform-management-database",
        "region": "us-east-1"
      },
      {
        "id": "platform-management-cache",
        "type": "redis",
        "name": "platform-management-cache",
        "region": "us-east-1"
      }
    ]
  },
  "services": [
    {
      "id": "platform-management",
      "name": "platform-management",
      "type": "Service",
      "config": {
        "runtimeDependencies": ["database", "cache"]  // ← Used for validation
      }
    }
  ]
}
```

### Step 3: Platform Receives Release
```typescript
// POST /releases
// platform-management/domain/services/release.service.ts

async createRelease(applicationId: string, manifest: ReleaseManifest) {
  // Store manifest in S3
  await this.s3.putObject({
    Key: `apps/${applicationId}/releases/${manifest.version}/manifest.json`,
    Body: JSON.stringify(manifest)
  });
  
  // Create Release record in database
  const release = this.em.create(Release, {
    application,
    version: manifest.version,
    gitCommit: manifest.gitCommit,
    manifestUrl: s3Url,
    status: 'READY'
  });
  
  await this.em.flush();
  return release;
}
```

### Step 4: User Deploys
```bash
forklaunch deploy create --release 1.0.0 --environment production --region us-east-1
```

### Step 5: Platform Orchestrates Deployment
```typescript
// POST /deployments
// platform-management/domain/services/deployment.service.ts

async createDeployment(request: CreateDeploymentRequest) {
  // 1. Fetch release manifest from S3
  const manifest = await this.fetchReleaseManifest(applicationId, releaseVersion);
  
  // 2. Validate: Do services' runtimeDependencies match infrastructure.resources?
  this.validateInfrastructure(manifest);
  
  // 3. Load environment variables from database
  const envVars = await this.getEnvironmentVariables(applicationId, environment, region);
  
  // 4. Generate Pulumi code
  const pulumiCode = await this.pulumiGenerator.generatePulumiCode({
    application,
    manifest,
    environment,
    region,
    envVars
  });
  
  // 5. Execute Pulumi
  const result = await this.pulumiExecutor.executePulumi({
    code: pulumiCode,
    stackName: `${applicationId}-${environment}-${region}`,
    region
  });
  
  // 6. Update deployment status
  deployment.status = 'COMPLETED';
  deployment.metadata = {
    resources: result.outputs,
    connectionStrings: this.generateConnectionStrings(result.outputs)
  };
}
```

### Step 6: Pulumi Generator Creates Infrastructure Code
```typescript
// platform-management/domain/services/pulumi-generator.service.ts

async generatePulumiCode(config: GenerateConfig): Promise<string> {
  const resources = config.manifest.infrastructure.resources || [];
  
  let pulumiCode = `
    import * as pulumi from "@pulumi/pulumi";
    import * as aws from "@pulumi/aws";
  `;
  
  for (const resource of resources) {
    switch (resource.type) {  // ← Uses SPECIFIC type from CLI
      case 'postgresql':
        pulumiCode += `
          // Create RDS PostgreSQL for ${resource.name}
          const ${resource.id} = new aws.rds.Instance("${resource.id}", {
            engine: "postgres",
            engineVersion: "15.3",
            instanceClass: "db.t3.micro",  // FREE TIER
            allocatedStorage: 20,          // FREE TIER
            dbName: "${resource.name.replace(/-/g, '_')}",
            username: pulumi.secret("${config.envVars.get('DB_USER') || 'admin'}"),
            password: pulumi.secret("${config.envVars.get('DB_PASSWORD')}"),
            skipFinalSnapshot: ${config.environment !== 'production'},
            publiclyAccessible: false,
            vpcSecurityGroupIds: [securityGroup.id],
            tags: {
              Application: "${config.application.name}",
              Environment: "${config.environment}",
              ManagedBy: "ForkLaunch"
            }
          });
          
          export const ${resource.id}_endpoint = ${resource.id}.endpoint;
          export const ${resource.id}_port = ${resource.id}.port;
        `;
        break;
        
      case 'mysql':
        pulumiCode += `
          const ${resource.id} = new aws.rds.Instance("${resource.id}", {
            engine: "mysql",
            engineVersion: "8.0",
            instanceClass: "db.t3.micro",
            // ... similar config
          });
        `;
        break;
        
      case 'redis':
        pulumiCode += `
          // Create ElastiCache Redis for ${resource.name}
          const ${resource.id} = new aws.elasticache.Cluster("${resource.id}", {
            engine: "redis",
            engineVersion: "7.0",
            nodeType: "cache.t3.micro",    // FREE TIER
            numCacheNodes: 1,
            parameterGroupName: "default.redis7",
            port: 6379,
            securityGroupIds: [securityGroup.id],
            tags: {
              Application: "${config.application.name}",
              Environment: "${config.environment}",
              ManagedBy: "ForkLaunch"
            }
          });
          
          export const ${resource.id}_endpoint = ${resource.id}.cacheNodes[0].address;
        `;
        break;
        
      case 's3':
        pulumiCode += `
          // Create S3 bucket for ${resource.name}
          const ${resource.id} = new aws.s3.Bucket("${resource.id}", {
            bucket: "${config.application.name}-${resource.name}-${config.environment}",
            acl: "private",
            versioning: { enabled: true },
            serverSideEncryptionConfiguration: {
              rule: {
                applyServerSideEncryptionByDefault: {
                  sseAlgorithm: "AES256"
                }
              }
            },
            tags: {
              Application: "${config.application.name}",
              Environment: "${config.environment}",
              ManagedBy: "ForkLaunch"
            }
          });
          
          export const ${resource.id}_name = ${resource.id}.bucket;
        `;
        break;
        
      case 'mongodb':
        pulumiCode += `
          // Create DocumentDB (MongoDB-compatible) for ${resource.name}
          const ${resource.id} = new aws.docdb.Cluster("${resource.id}", {
            engine: "docdb",
            masterUsername: pulumi.secret("${config.envVars.get('DB_USER') || 'admin'}"),
            masterPassword: pulumi.secret("${config.envVars.get('DB_PASSWORD')}"),
            dbSubnetGroupName: dbSubnetGroup.name,
            vpcSecurityGroupIds: [securityGroup.id],
            // ... config
          });
        `;
        break;
        
      default:
        throw new Error(`Unsupported resource type: ${resource.type}`);
    }
  }
  
  return pulumiCode;
}
```

### Step 7: Pulumi Executor Runs Infrastructure
```typescript
// platform-management/domain/services/pulumi-executor.service.ts

async executePulumi(config: ExecuteConfig): Promise<PulumiResult> {
  // 1. Write Pulumi code to temp directory
  const workDir = `/tmp/pulumi/${config.stackName}`;
  await fs.writeFile(`${workDir}/index.ts`, config.code);
  
  // 2. Initialize Pulumi stack with S3 backend
  await exec(`pulumi login s3://forklaunch-pulumi-state`);
  await exec(`pulumi stack init ${config.stackName}`);
  
  // 3. Configure AWS region
  await exec(`pulumi config set aws:region ${config.region}`);
  
  // 4. Run pulumi up
  const result = await exec(`pulumi up --yes --json`);
  
  // 5. Parse outputs
  const outputs = JSON.parse(result.stdout);
  
  return {
    status: 'success',
    outputs: {
      // Connection strings generated from Pulumi outputs
      'platform-management-db_endpoint': 'mydb.abc123.us-east-1.rds.amazonaws.com',
      'platform-management-db_port': '5432',
      'platform-management-cache_endpoint': 'mycache.abc123.0001.use1.cache.amazonaws.com'
    }
  };
}
```

### Step 8: Platform Generates Connection Strings
```typescript
// Using Pulumi outputs and runtimeDependencies

for (const service of manifest.services) {
  const envVars = {};
  
  if (service.config.runtimeDependencies?.includes('database')) {
    // Find matching infrastructure resource
    const dbResource = manifest.infrastructure.resources?.find(r => 
      r.id.startsWith(service.id) && 
      ['postgresql', 'mysql', 'mongodb'].includes(r.type)
    );
    
    if (dbResource) {
      const endpoint = pulumiOutputs[`${dbResource.id}_endpoint`];
      const port = pulumiOutputs[`${dbResource.id}_port`];
      const user = await this.secretsManager.get(`${service.id}_db_user`);
      const password = await this.secretsManager.get(`${service.id}_db_password`);
      
      // Generate connection string based on SPECIFIC type
      switch (dbResource.type) {
        case 'postgresql':
          envVars.DATABASE_URL = `postgresql://${user}:${password}@${endpoint}:${port}/${dbResource.name}`;
          break;
        case 'mysql':
          envVars.DATABASE_URL = `mysql://${user}:${password}@${endpoint}:${port}/${dbResource.name}`;
          break;
        case 'mongodb':
          envVars.DATABASE_URL = `mongodb://${user}:${password}@${endpoint}:${port}/${dbResource.name}`;
          break;
      }
    }
  }
  
  if (service.config.runtimeDependencies?.includes('cache')) {
    const cacheResource = manifest.infrastructure.resources?.find(r => 
      r.id.startsWith(service.id) && r.type === 'redis'
    );
    
    if (cacheResource) {
      const endpoint = pulumiOutputs[`${cacheResource.id}_endpoint`];
      envVars.REDIS_URL = `redis://${endpoint}:6379`;
    }
  }
  
  if (service.config.runtimeDependencies?.includes('storage')) {
    const storageResource = manifest.infrastructure.resources?.find(r => 
      r.id.startsWith(service.id) && r.type === 's3'
    );
    
    if (storageResource) {
      envVars.S3_BUCKET = pulumiOutputs[`${storageResource.id}_name`];
    }
  }
  
  // Inject env vars into ECS task definition
  await this.updateServiceEnvironment(service.id, environment, region, envVars);
}
```

---

## Summary: How `resource.type` is Used

### CLI Side
```rust
// Reads from manifest.toml
database = "postgresql"  // ← User-specified database type

// Generates release manifest
ResourceDefinition {
    type: "postgresql"  // ← Passed to platform
}
```

### Platform Side
```typescript
// Pulumi Generator
switch (resource.type) {
  case 'postgresql': createRDSPostgres(); break;
  case 'mysql': createRDSMySQL(); break;
  case 'redis': createElastiCache(); break;
  case 's3': createS3Bucket(); break;
  case 'mongodb': createDocumentDB(); break;
}

// Connection String Generator
switch (resource.type) {
  case 'postgresql': return `postgresql://...`;
  case 'mysql': return `mysql://...`;
  case 'mongodb': return `mongodb://...`;
}
```

### AWS Resources Created
- `postgresql` → **AWS RDS PostgreSQL** (db.t3.micro, free tier)
- `mysql` → **AWS RDS MySQL** (db.t3.micro, free tier)
- `redis` → **AWS ElastiCache Redis** (cache.t3.micro, free tier)
- `s3` → **AWS S3 Bucket** (standard storage)
- `mongodb` → **AWS DocumentDB** (db.t3.medium, MongoDB-compatible)

**Yes, `resources[].type` gives the platform EXACTLY what it needs for Pulumi!** ✅


