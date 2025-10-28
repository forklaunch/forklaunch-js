# Pure OpenAPI Generator - Static Analysis Approach

**Concept**: Create a standalone tool that **parses route files** without running the server.

## Architecture

Instead of:
```
Run server → Initialize dependencies → Generate OpenAPI → Exit
```

Do:
```
Parse route files → Extract metadata → Generate OpenAPI
```

**Result**: Pure, fast, zero dependencies!

---

## Package Structure

### New Package: `@forklaunch/openapi-generator`

```
framework/openapi-generator/
├── package.json
├── src/
│   ├── index.ts              # CLI entry point
│   ├── parser.ts             # Parse route files
│   ├── extractor.ts          # Extract route metadata
│   ├── generator.ts          # Generate OpenAPI from metadata
│   └── types.ts              # Type definitions
└── bin/
    └── forklaunch-openapi    # CLI executable
```

---

## How It Works

### 1. Parse Route Files (Static Analysis)

**Input**: Route files in `src/modules/{service}/api/routes/`

```typescript
// Example: src/modules/iam-base/api/routes/user.routes.ts
import { z } from 'zod';

export const userRoutes = [
  {
    method: 'GET',
    path: '/v1/users',
    handler: UserController.prototype.list,
    schema: {
      response: {
        200: z.array(UserSchema)
      }
    }
  },
  {
    method: 'POST',
    path: '/v2/users',
    handler: UserController.prototype.create,
    schema: {
      body: CreateUserSchema,
      response: {
        201: UserSchema
      }
    }
  }
];
```

### 2. Extract Route Metadata

Use TypeScript compiler API to parse files:

```typescript
// framework/openapi-generator/src/parser.ts

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export interface ParsedRoute {
  method: string;
  path: string;
  handler: string;
  schema?: {
    body?: any;
    query?: any;
    params?: any;
    response?: Record<number, any>;
  };
  tags?: string[];
  summary?: string;
  description?: string;
}

export function parseRouteFile(filePath: string): ParsedRoute[] {
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );
  
  const routes: ParsedRoute[] = [];
  
  // Walk AST to find route definitions
  function visit(node: ts.Node) {
    // Find array literals that look like route definitions
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'routes') {
      // Extract route objects
      routes.push(...extractRoutesFromNode(node.initializer));
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return routes;
}

function extractRoutesFromNode(node: ts.Node | undefined): ParsedRoute[] {
  // Parse the route array literal
  // Extract method, path, schema, etc.
  // ...
}
```

### 3. Organize by Version

```typescript
// framework/openapi-generator/src/extractor.ts

export interface VersionedRoutes {
  [version: string]: ParsedRoute[];
}

export function organizeRoutesByVersion(routes: ParsedRoute[]): VersionedRoutes {
  const versioned: VersionedRoutes = {};
  
  for (const route of routes) {
    // Extract version from path: /v1/users -> v1
    const match = route.path.match(/^\/(v\d+)\//);
    const version = match ? match[1] : 'v1';
    
    if (!versioned[version]) {
      versioned[version] = [];
    }
    
    versioned[version].push(route);
  }
  
  return versioned;
}
```

### 4. Generate OpenAPI Specs

```typescript
// framework/openapi-generator/src/generator.ts

import { OpenAPIV3 } from 'openapi-types';

export function generateOpenApiSpec(
  serviceName: string,
  version: string,
  routes: ParsedRoute[]
): OpenAPIV3.Document {
  
  const spec: OpenAPIV3.Document = {
    openapi: '3.1.0',
    info: {
      title: serviceName,
      version: version,
    },
    servers: [
      { url: `/${version}` }
    ],
    paths: {},
    components: {
      schemas: {},
    },
  };
  
  // Convert parsed routes to OpenAPI paths
  for (const route of routes) {
    const pathKey = route.path.replace(/^\/(v\d+)/, ''); // Remove version prefix
    
    if (!spec.paths[pathKey]) {
      spec.paths[pathKey] = {};
    }
    
    spec.paths[pathKey][route.method.toLowerCase()] = {
      operationId: route.handler,
      summary: route.summary,
      description: route.description,
      tags: route.tags || [serviceName],
      ...(route.schema?.body && {
        requestBody: convertSchemaToOpenAPI(route.schema.body)
      }),
      responses: convertResponsesToOpenAPI(route.schema?.response || {}),
    };
  }
  
  return spec;
}

function convertSchemaToOpenAPI(schema: any): OpenAPIV3.RequestBodyObject {
  // Convert Zod/TypeBox schema to OpenAPI schema
  // Use existing schema converters from framework
  // ...
}

function convertResponsesToOpenAPI(responses: Record<number, any>): OpenAPIV3.ResponsesObject {
  // Convert response schemas to OpenAPI
  // ...
}
```

### 5. Main CLI

```typescript
// framework/openapi-generator/src/index.ts

import * as fs from 'fs';
import * as path from 'path';
import { parseRouteFile } from './parser';
import { organizeRoutesByVersion } from './extractor';
import { generateOpenApiSpec } from './generator';

export interface GenerateOptions {
  serviceDir: string;
  serviceName: string;
  outputFile: string;
}

export async function generate(options: GenerateOptions) {
  const routesDir = path.join(options.serviceDir, 'api', 'routes');
  
  // Find all route files
  const routeFiles = fs.readdirSync(routesDir)
    .filter(f => f.endsWith('.routes.ts') || f.endsWith('.routes.js'))
    .map(f => path.join(routesDir, f));
  
  // Parse all routes
  const allRoutes: ParsedRoute[] = [];
  for (const file of routeFiles) {
    const routes = parseRouteFile(file);
    allRoutes.push(...routes);
  }
  
  // Organize by version
  const versionedRoutes = organizeRoutesByVersion(allRoutes);
  
  // Generate OpenAPI spec for each version
  const versionedSpecs: Record<string, OpenAPIV3.Document> = {};
  for (const [version, routes] of Object.entries(versionedRoutes)) {
    versionedSpecs[version] = generateOpenApiSpec(
      options.serviceName,
      version,
      routes
    );
  }
  
  // Write output
  fs.writeFileSync(
    options.outputFile,
    JSON.stringify(versionedSpecs, null, 2)
  );
  
  console.log(`✓ Generated OpenAPI for ${options.serviceName}`);
  console.log(`  Versions: ${Object.keys(versionedSpecs).join(', ')}`);
  console.log(`  Output: ${options.outputFile}`);
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const serviceDir = args[0] || process.cwd();
  const serviceName = args[1] || path.basename(serviceDir);
  const outputFile = args[2] || 'openapi.json';
  
  generate({ serviceDir, serviceName, outputFile });
}
```

---

## Usage

### Install Package

```bash
npm install -D @forklaunch/openapi-generator
```

### CLI Usage

```bash
# From service directory
npx forklaunch-openapi

# With custom paths
npx forklaunch-openapi ./src/modules/iam-base iam-base ./dist/openapi.json

# Output: { "v1": {...}, "v2": {...} }
```

### Programmatic Usage

```typescript
import { generate } from '@forklaunch/openapi-generator';

await generate({
  serviceDir: './src/modules/iam-base',
  serviceName: 'iam-base',
  outputFile: './dist/openapi.json'
});
```

### In CLI (Rust)

```rust
// cli/src/core/openapi_export.rs

pub fn export_all_services(
    app_root: &Path,
    manifest: &ApplicationManifestData,
    dist_path: &Path,
) -> Result<HashMap<String, HashMap<String, Value>>> {
    let mut all_specs = HashMap::new();
    let modules_path = app_root.join(&manifest.modules_path);
    
    for project in &manifest.projects {
        if project.r#type != ProjectType::Service {
            continue;
        }
        
        let service_path = modules_path.join(&project.name);
        let output_path = dist_path.join(&project.name).join("openapi.json");
        
        // ✅ Use pure static generator
        let status = Command::new("npx")
            .args(&[
                "@forklaunch/openapi-generator",
                service_path.to_str().unwrap(),
                &project.name,
                output_path.to_str().unwrap(),
            ])
            .status()?;
        
        if !status.success() {
            bail!("Failed to generate OpenAPI for {}", project.name);
        }
        
        // Read versioned output
        let content = read_to_string(&output_path)?;
        let versioned_specs: HashMap<String, Value> = serde_json::from_str(&content)?;
        
        all_specs.insert(project.name.clone(), versioned_specs);
    }
    
    Ok(all_specs)
}
```

---

## Benefits

### 1. Pure & Fast
- ✅ No server startup
- ✅ No dependency injection
- ✅ No database connections
- ✅ Static analysis only
- ✅ Runs in milliseconds

### 2. Zero Dependencies
- ✅ No MikroORM
- ✅ No Redis
- ✅ No Docker
- ✅ No .env files needed
- ✅ Works anywhere

### 3. Standalone
- ✅ Separate npm package
- ✅ Can be used independently
- ✅ Works in CI/CD
- ✅ Pre-commit hooks
- ✅ Documentation generation

### 4. Reliable
- ✅ No runtime errors
- ✅ No environment issues
- ✅ Deterministic output
- ✅ Easy to test

---

## Implementation Steps

### Phase 1: Parser (2 days)
- [ ] Create `@forklaunch/openapi-generator` package
- [ ] Implement TypeScript AST parser
- [ ] Extract route definitions from files
- [ ] Parse Zod/TypeBox schemas

### Phase 2: Generator (1 day)
- [ ] Convert parsed routes to OpenAPI format
- [ ] Organize by version
- [ ] Generate complete OpenAPI 3.1 specs

### Phase 3: CLI (1 day)
- [ ] Create CLI interface
- [ ] Add error handling
- [ ] Test with real services

### Phase 4: Integration (1 day)
- [ ] Update Rust CLI to use generator
- [ ] Test end-to-end
- [ ] Documentation

**Total**: ~5 days

---

## Alternative: Simpler Approach

If full AST parsing is complex, use a **convention-based approach**:

### Convention: Export Metadata

```typescript
// src/modules/iam-base/api/routes/user.routes.ts

export const metadata = {
  version: 'v1',
  basePath: '/users',
  tags: ['Users'],
};

export const routes = [
  {
    method: 'GET',
    path: '',  // Becomes /v1/users
    handler: 'list',
    summary: 'List users',
    response: {
      200: UserSchema
    }
  }
];
```

Then just `import()` and read the metadata:

```typescript
// Much simpler!
const module = await import(routeFilePath);
const routes = module.routes;
const metadata = module.metadata;

// Generate OpenAPI from exported data
```

---

## Hybrid Approach (Recommended)

**Best of both worlds**:

1. **For ForkLaunch apps**: Use convention-based import
   - Route files export metadata
   - Generator imports and reads
   - Fast, simple, reliable

2. **For custom apps**: Use AST parsing fallback
   - Parse TypeScript/JavaScript files
   - Extract what we can
   - More flexible but slower

---

## Decision Point

Which approach do you prefer?

### Option A: Pure AST Parsing
- ✅ Completely pure
- ✅ Works with any code structure
- ⚠️ More complex to implement
- ⚠️ Harder to maintain

### Option B: Convention-Based Import
- ✅ Simple and fast
- ✅ Easy to implement
- ✅ Easy to maintain
- ⚠️ Requires specific export format

### Option C: Hybrid
- ✅ Best of both worlds
- ✅ Convention for ForkLaunch
- ✅ AST parsing as fallback
- ⚠️ Most code to write

**Recommendation**: Start with **Option B** (Convention-Based), add AST parsing later if needed.

---

## Quick Win: Today

Update route files to export metadata:

```typescript
// src/modules/iam-base/api/routes/user.routes.ts

export const openapi = {
  version: 'v1',
  tags: ['Users'],
  routes: [
    {
      method: 'GET',
      path: '/v1/users',
      summary: 'List users',
      schema: { response: { 200: z.array(UserSchema) } }
    }
  ]
};

// Existing route registration
export const routes = [...];
```

Then the generator just reads `openapi` export!

---

## Next Steps

1. **Decide on approach** (Convention-based recommended)
2. **Create package structure**
3. **Implement basic generator**
4. **Test with one service**
5. **Integrate with CLI**

Want me to start implementing the convention-based generator? It could be done in a few hours!

