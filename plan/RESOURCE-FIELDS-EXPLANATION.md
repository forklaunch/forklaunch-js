# Resource Fields Explanation

## Two Levels of Resource Information

The release manifest contains TWO different but complementary resource fields:

### 1. **`infrastructure.resources[]`** - Platform Provisioning (What to Create)

**Source**: Manifest's `projects[].resources` (ResourceInventory)  
**Purpose**: Tell Pulumi WHAT and HOW to provision infrastructure  
**Specificity**: SPECIFIC database types

```json
{
  "infrastructure": {
    "regions": ["us-east-1"],
    "resources": [
      {
        "id": "platform-management-db",
        "type": "postgresql",     // ← SPECIFIC: Provision RDS PostgreSQL
        "name": "platform-management-database",
        "region": "us-east-1"
      },
      {
        "id": "platform-management-cache",
        "type": "redis",          // ← SPECIFIC: Provision ElastiCache Redis
        "name": "platform-management-cache",
        "region": "us-east-1"
      },
      {
        "id": "iam-db",
        "type": "postgresql",     // ← SPECIFIC: Another RDS PostgreSQL
        "name": "iam-database",
        "region": "us-east-1"
      }
    ]
  }
}
```

**Platform Usage**:
```typescript
// pulumi-generator.service.ts
for (const resource of manifest.infrastructure.resources) {
  switch (resource.type) {
    case 'postgresql':
      // Create RDS PostgreSQL instance
      new aws.rds.Instance(resource.id, {
        engine: 'postgres',
        instanceClass: 'db.t3.micro', // free tier
        ...
      });
      break;
    case 'mysql':
      // Create RDS MySQL instance
      break;
    case 'redis':
      // Create ElastiCache Redis cluster
      new aws.elasticache.Cluster(resource.id, {
        engine: 'redis',
        nodeType: 'cache.t3.micro', // free tier
        ...
      });
      break;
    case 's3':
      // Create S3 bucket
      new aws.s3.Bucket(resource.id, { ... });
      break;
  }
}
```

---

### 2. **`services[].config.runtimeDependencies`** - Service Documentation (What is Used)

**Source**: AST analysis of `registrations.ts` files  
**Purpose**: Document and validate what each service ACTUALLY needs  
**Specificity**: CATEGORIES only

```json
{
  "services": [
    {
      "id": "platform-management",
      "name": "platform-management",
      "type": "Service",
      "config": {
        "openApiSpec": { ... },
        "runtimeDependencies": ["database", "cache"]  // ← CATEGORIES: Needs DB and Cache
      }
    },
    {
      "id": "iam",
      "name": "iam",
      "type": "Service",
      "config": {
        "openApiSpec": { ... },
        "runtimeDependencies": ["database"]  // ← CATEGORIES: Only needs DB
      }
    },
    {
      "id": "analytics-worker",
      "name": "analytics-worker",
      "type": "Worker",
      "config": {
        "runtimeDependencies": ["database", "queue", "storage"]  // ← Worker needs DB, Queue, Storage
      }
    }
  ]
}
```

**Platform Usage**:
```typescript
// deployment.service.ts - Validation
for (const service of manifest.services) {
  for (const dep of service.config.runtimeDependencies || []) {
    // Validate: Does infrastructure provide a resource of this category?
    const hasResource = manifest.infrastructure.resources.some(r => 
      (dep === 'database' && ['postgresql', 'mysql', 'mongodb'].includes(r.type)) ||
      (dep === 'cache' && r.type === 'redis') ||
      (dep === 'storage' && r.type === 's3') ||
      (dep === 'queue' && ['kafka', 'sqs'].includes(r.type))
    );
    
    if (!hasResource) {
      throw new Error(`Service ${service.name} requires ${dep} but none provisioned`);
    }
  }
}

// Generate connection strings per service
for (const service of manifest.services) {
  const envVars = {};
  
  if (service.config.runtimeDependencies?.includes('database')) {
    // Find the database resource for this service
    const dbResource = manifest.infrastructure.resources.find(r => 
      r.id.startsWith(service.id) && ['postgresql', 'mysql', 'mongodb'].includes(r.type)
    );
    
    // Generate connection string based on SPECIFIC type
    envVars.DATABASE_URL = generateConnectionString(dbResource);
  }
  
  if (service.config.runtimeDependencies?.includes('cache')) {
    const cacheResource = manifest.infrastructure.resources.find(r => 
      r.id.startsWith(service.id) && r.type === 'redis'
    );
    envVars.REDIS_URL = generateRedisUrl(cacheResource);
  }
}
```

---

## Why Both?

### `infrastructure.resources` (Provisioning)
✅ **Specific types** for Pulumi: "postgresql", "mysql", "redis", "s3"  
✅ **Infrastructure-level**: Shared resources  
✅ **Platform controls**: Free tier defaults, regions, sizing  

### `services[].runtimeDependencies` (Validation)
✅ **Code-derived**: What the service actually uses  
✅ **Service-level**: Per-service dependencies  
✅ **Validation**: Catch missing infrastructure  
✅ **Documentation**: Clear dependency graph  

---

## Example Flow

### 1. CLI Generates Release Manifest

```bash
forklaunch release create --version 1.0.0
```

**From `manifest.toml`**:
```toml
[[projects]]
type = "Service"
name = "platform-management"

[projects.resources]
database = "postgresql"  # ← infrastructure.resources[].type = "postgresql"
cache = "redis"          # ← infrastructure.resources[].type = "redis"
```

**From `registrations.ts` AST scan**:
```typescript
export const runtimeDependencies = [MikroORM, RedisClient];
// ↓ Detected as ["database", "cache"]
```

### 2. Platform Provisions Infrastructure

```typescript
// Uses infrastructure.resources[].type
createRDSInstance('postgresql');
createElastiCache('redis');
```

### 3. Platform Validates & Connects

```typescript
// Uses runtimeDependencies to validate
service.needs('database') → infrastructure.has('postgresql') ✓
service.needs('cache') → infrastructure.has('redis') ✓

// Generate env vars
DATABASE_URL=postgres://...  # From postgresql resource
REDIS_URL=redis://...        # From redis resource
```

---

## Summary

| Field | Level | Specificity | Purpose | Used By |
|-------|-------|-------------|---------|---------|
| `infrastructure.resources[].type` | Infrastructure | **SPECIFIC** ("postgresql") | **Provisioning** | Pulumi Generator |
| `services[].runtimeDependencies` | Service | **CATEGORY** ("database") | **Validation** | Deployment Service |

**Both are needed and serve distinct purposes!** ✨


