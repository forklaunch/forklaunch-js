# Dummy Environment Variables Solution - The Cleanest Approach!

**Concept**: CLI analyzes registration types and generates dummy .env.local that satisfies all requirements.

## Why This Is Better

### Previous Approach (ConfigInjector Skip)
```typescript
// Skip dependencies
if (process.env.FORKLAUNCH_MODE === 'openapi') {
  return {};  // Empty object
}
```

**Problems**:
- ⚠️ Framework code needs modification
- ⚠️ Special case logic in core framework
- ⚠️ Controllers get empty objects (breaks type safety)
- ⚠️ MikroORM entities still fail on import

### New Approach (Dummy Values) ✅
```bash
# CLI generates .env.local with dummy values
DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
```

**Benefits**:
- ✅ No framework modifications needed!
- ✅ Everything initializes normally
- ✅ Type safe - real objects (just not connected)
- ✅ MikroORM entities import fine
- ✅ Nothing ever actually connects (app exits immediately)

---

## How It Works

### Step 1: CLI Analyzes Registration Types

Parse `registrations.ts` to extract required env vars and their types:

```rust
// cli/src/core/env_analyzer.rs

pub struct EnvVarRequirement {
    pub name: String,
    pub var_type: EnvVarType,  // String, Number, Boolean
    pub scope: String,         // Where it's used
}

pub enum EnvVarType {
    String,
    Number,
    Boolean,
}

pub fn analyze_env_requirements(registrations_path: &Path) -> Result<Vec<EnvVarRequirement>> {
    // Parse the file
    let content = read_to_string(registrations_path)?;
    
    // Extract environment config definitions
    let mut requirements = Vec::new();
    
    // Look for patterns like:
    // DATABASE_URL: { validator: string(), ... }
    // DB_PORT: { validator: number(), ... }
    
    // Simple regex approach:
    let env_pattern = Regex::new(r"(\w+):\s*\{\s*validator:\s*(\w+)\(\)")?;
    
    for cap in env_pattern.captures_iter(&content) {
        let name = cap[1].to_string();
        let validator = &cap[2];
        
        let var_type = match validator {
            "string" => EnvVarType::String,
            "number" => EnvVarType::Number,
            "boolean" => EnvVarType::Boolean,
            _ => EnvVarType::String,
        };
        
        requirements.push(EnvVarRequirement {
            name,
            var_type,
            scope: "service".to_string(),
        });
    }
    
    Ok(requirements)
}
```

### Step 2: Generate Dummy Values

```rust
// cli/src/core/dummy_env_generator.rs

pub fn generate_dummy_value(var_name: &str, var_type: &EnvVarType) -> String {
    match var_type {
        EnvVarType::String => {
            // Context-aware dummy values
            if var_name.contains("DATABASE_URL") || var_name.contains("DB_URL") {
                "postgresql://dummy:dummy@localhost:5432/dummy".to_string()
            } else if var_name.contains("REDIS_URL") {
                "redis://localhost:6379".to_string()
            } else if var_name.contains("KAFKA_URL") {
                "localhost:9092".to_string()
            } else if var_name.contains("S3_URL") {
                "http://localhost:9000".to_string()
            } else if var_name.contains("HOST") {
                "localhost".to_string()
            } else if var_name.contains("PROTOCOL") {
                "http".to_string()
            } else if var_name.contains("VERSION") {
                "v1".to_string()
            } else if var_name.contains("PATH") {
                "/docs".to_string()
            } else if var_name.contains("KEY") || var_name.contains("SECRET") {
                "dummy-secret-key".to_string()
            } else {
                "dummy-value".to_string()
            }
        },
        EnvVarType::Number => {
            if var_name.contains("PORT") {
                "3000".to_string()
            } else {
                "1".to_string()
            }
        },
        EnvVarType::Boolean => "true".to_string(),
    }
}

pub fn generate_dummy_env_file(
    requirements: &[EnvVarRequirement],
    output_path: &Path,
) -> Result<()> {
    let mut content = String::from("# Auto-generated dummy env vars for OpenAPI export\n");
    content.push_str("# This file is temporary and will be deleted after execution\n\n");
    
    for req in requirements {
        let value = generate_dummy_value(&req.name, &req.var_type);
        content.push_str(&format!("{}={}\n", req.name, value));
    }
    
    write(output_path, content)?;
    Ok(())
}
```

### Step 3: CLI Workflow

```rust
pub fn export_all_services(
    app_root: &Path,
    manifest: &ApplicationManifestData,
    dist_path: &Path,
) -> Result<HashMap<String, HashMap<String, Value>>> {
    let mut all_specs = HashMap::new();
    let modules_path = app_root.join(&manifest.modules_path);
    let package_manager = detect_package_manager(app_root)?;
    
    for project in &manifest.projects {
        if project.r#type != ProjectType::Service {
            continue;
        }
        
        let service_path = modules_path.join(&project.name);
        
        // ✅ Analyze env requirements
        let registrations_path = service_path.join("registrations.ts");
        let env_requirements = analyze_env_requirements(&registrations_path)?;
        
        // ✅ Generate dummy .env.local
        let dummy_env_path = service_path.join(".env.local");
        generate_dummy_env_file(&env_requirements, &dummy_env_path)?;
        
        // ✅ Generate runner script
        let runner_path = app_root.join(".forklaunch-tmp")
            .join(format!("{}-runner.ts", project.name));
        let runner_script = generate_runner_script(&manifest.modules_path, &project.name)?;
        write(&runner_path, runner_script)?;
        
        let output_path = dist_path.join(&project.name).join("openapi.json");
        
        // ✅ Run with OpenAPI mode
        let status = match package_manager {
            PackageManager::Pnpm => {
                Command::new("pnpm")
                    .args(&["tsx", runner_path.to_str().unwrap()])
                    .current_dir(app_root)
                    .env("FORKLAUNCH_MODE", "openapi")
                    .env("FORKLAUNCH_OPENAPI_OUTPUT", output_path.to_str().unwrap())
                    .env("DOTENV_FILE_PATH", dummy_env_path.to_str().unwrap())  // ✅ Use dummy
                    .status()?
            },
            // ... Bun, Npm ...
        };
        
        if !status.success() {
            bail!("Failed to export OpenAPI for {}", project.name);
        }
        
        // Read versioned output
        let content = read_to_string(&output_path)?;
        let versioned_specs: HashMap<String, Value> = serde_json::from_str(&content)?;
        all_specs.insert(project.name.clone(), versioned_specs);
        
        // ✅ Clean up dummy env file
        remove_file(&dummy_env_path)?;
        remove_file(&runner_path)?;
    }
    
    Ok(all_specs)
}
```

---

## Benefits

### 1. ✅ No Framework Changes Needed!
- Don't need to modify configInjector
- Don't need special skip logic
- Framework works normally

### 2. ✅ Everything Initializes
- MikroORM initializes with dummy DB
- Redis client created (doesn't actually connect)
- All dependencies resolve properly

### 3. ✅ Type Safe
- Controllers get real objects
- Type system happy
- IntelliSense works

### 4. ✅ No Actual Connections
- OpenAPI mode exits immediately in listen()
- No database queries executed
- No Redis commands sent
- App exits before anything connects

---

## Example Generated .env.local

```bash
# Auto-generated dummy env vars for OpenAPI export
# This file is temporary and will be deleted after execution

# Database
DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
DB_NAME=dummy
DB_HOST=localhost
DB_USER=dummy
DB_PASSWORD=dummy
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# Server
PROTOCOL=http
HOST=localhost
PORT=3000
VERSION=v1
DOCS_PATH=/docs

# OpenTelemetry
OTEL_SERVICE_NAME=billing-base
OTEL_LEVEL=info
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Auth
JWKS_PUBLIC_KEY_URL=http://localhost:3000/jwks

# Misc
NODE_ENV=development
```

---

## Analysis: Extracting Types from Registrations

### Simple Regex Approach

```rust
fn analyze_env_requirements(registrations_path: &Path) -> Result<Vec<EnvVarRequirement>> {
    let content = read_to_string(registrations_path)?;
    let mut requirements = Vec::new();
    
    // Match: VAR_NAME: { validator: string() }
    let string_pattern = Regex::new(r"(\w+):\s*\{\s*validator:\s*string\(\)")?;
    for cap in string_pattern.captures_iter(&content) {
        requirements.push(EnvVarRequirement {
            name: cap[1].to_string(),
            var_type: EnvVarType::String,
            scope: "service".to_string(),
        });
    }
    
    // Match: VAR_NAME: { validator: number() }
    let number_pattern = Regex::new(r"(\w+):\s*\{\s*validator:\s*number\(\)")?;
    for cap in number_pattern.captures_iter(&content) {
        requirements.push(EnvVarRequirement {
            name: cap[1].to_string(),
            var_type: EnvVarType::Number,
            scope: "service".to_string(),
        });
    }
    
    // Match: VAR_NAME: { validator: boolean() }
    let boolean_pattern = Regex::new(r"(\w+):\s*\{\s*validator:\s*boolean\(\)")?;
    for cap in boolean_pattern.captures_iter(&content) {
        requirements.push(EnvVarRequirement {
            name: cap[1].to_string(),
            var_type: EnvVarType::Boolean,
            scope: "service".to_string(),
        });
    }
    
    Ok(requirements)
}
```

### Already Have This Data!

Actually, the CLI **already detects env vars** in `cli/src/core/ast/infrastructure/env.rs`! You can reuse that:

```rust
// cli/src/core/ast/infrastructure/env.rs already has:
pub fn find_all_env_vars(modules_path: &Path) -> Result<HashMap<String, Vec<EnvVar>>>

// Just need to add dummy value generation!
```

---

## Updated Implementation (Even Simpler!)

### Reuse Existing Env Var Detection

```rust
use crate::core::ast::infrastructure::env::find_all_env_vars;

pub fn export_all_services(
    app_root: &Path,
    manifest: &ApplicationManifestData,
    dist_path: &Path,
) -> Result<HashMap<String, HashMap<String, Value>>> {
    
    let modules_path = app_root.join(&manifest.modules_path);
    
    // ✅ Use existing env var detection!
    let all_env_vars = find_all_env_vars(&modules_path)?;
    
    for project in &manifest.projects {
        if project.r#type != ProjectType::Service {
            continue;
        }
        
        // Get env vars for this service
        let service_env_vars = all_env_vars.get(&project.name).unwrap_or(&vec![]);
        
        // ✅ Generate dummy .env.local
        let dummy_env_path = modules_path.join(&project.name).join(".env.local");
        generate_dummy_env_file(service_env_vars, &dummy_env_path)?;
        
        // Run OpenAPI export (with dummy env)
        // ...
        
        // Clean up
        remove_file(&dummy_env_path)?;
    }
    
    Ok(all_specs)
}

fn generate_dummy_env_file(env_vars: &[EnvVar], output_path: &Path) -> Result<()> {
    let mut content = String::from(
        "# Auto-generated dummy env vars for OpenAPI export\n\
         # This file is temporary and will be deleted\n\n"
    );
    
    for var in env_vars {
        let value = generate_dummy_value(&var.name, &var.var_type);
        content.push_str(&format!("{}={}\n", var.name, value));
    }
    
    write(output_path, content)?;
    Ok(())
}

fn generate_dummy_value(var_name: &str, var_type: &str) -> String {
    match var_type {
        "string" => {
            if var_name.contains("DATABASE_URL") {
                "postgresql://dummy:dummy@localhost:5432/dummy"
            } else if var_name.contains("REDIS_URL") {
                "redis://localhost:6379"
            } else if var_name == "HOST" {
                "localhost"
            } else if var_name == "PROTOCOL" {
                "http"
            } else if var_name == "VERSION" {
                "v1"
            } else if var_name == "DOCS_PATH" {
                "/docs"
            } else {
                "dummy-value"
            }
        },
        "number" => {
            if var_name.contains("PORT") {
                "3000"
            } else {
                "1"
            }
        },
        "boolean" => "true",
        _ => "dummy-value",
    }.to_string()
}
```

---

## Execution Flow

```
1. CLI analyzes registrations.ts
   → Finds: DATABASE_URL (string), DB_PORT (number), REDIS_URL (string)

2. CLI generates .env.local with dummy values
   DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
   DB_PORT=5432
   REDIS_URL=redis://localhost:6379

3. CLI runs: pnpm tsx runner.ts
   with: DOTENV_FILE_PATH=.env.local, FORKLAUNCH_MODE=openapi

4. Runner imports server.ts
   → Loads .env.local (dummy values)
   → MikroORM initializes with dummy config
   → Redis client created with dummy URL
   → All dependencies resolve successfully! ✅

5. Runner calls app.listen()
   → Framework sees FORKLAUNCH_MODE=openapi
   → Generates OpenAPI from registered routes
   → Writes to file
   → Exits immediately (before any actual connections)

6. CLI reads OpenAPI output
   → Gets versioned specs

7. CLI cleans up .env.local
   → Removes temporary file
```

---

## Smart Dummy Values

### Database URLs
```rust
fn generate_database_url(db_type: Option<&str>) -> String {
    match db_type {
        Some("postgresql") | Some("postgres") => 
            "postgresql://dummy:dummy@localhost:5432/dummy",
        Some("mysql") => 
            "mysql://dummy:dummy@localhost:3306/dummy",
        Some("mongodb") => 
            "mongodb://localhost:27017/dummy",
        Some("sqlite") => 
            "file::memory:?cache=shared",  // In-memory SQLite
        _ => 
            "postgresql://dummy:dummy@localhost:5432/dummy",  // Default
    }
}
```

### Common Variables
```rust
fn get_common_dummy_vars() -> HashMap<String, String> {
    [
        ("HOST", "localhost"),
        ("PROTOCOL", "http"),
        ("VERSION", "v1"),
        ("DOCS_PATH", "/docs"),
        ("NODE_ENV", "development"),
        ("OTEL_SERVICE_NAME", "service"),
        ("OTEL_LEVEL", "info"),
        ("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
        ("JWT_SECRET", "dummy-jwt-secret-key-for-openapi-export"),
        ("ENCRYPTION_KEY", "dummy-encryption-key"),
        ("API_KEY", "dummy-api-key"),
    ]
    .iter()
    .map(|(k, v)| (k.to_string(), v.to_string()))
    .collect()
}
```

---

## Advantages Over ConfigInjector Skip

| Aspect | ConfigInjector Skip | Dummy Env Vars |
|--------|-------------------|----------------|
| **Framework Changes** | ❌ Need to modify core | ✅ No changes needed |
| **Type Safety** | ⚠️ Empty objects | ✅ Real objects |
| **Entity Imports** | ❌ May fail | ✅ Work fine |
| **Decorator Errors** | ❌ Can occur | ✅ Don't occur |
| **Maintainability** | ⚠️ Special case in core | ✅ CLI-only concern |
| **CI Compatibility** | ⚠️ Unknown | ✅ Works everywhere |
| **Debugging** | ⚠️ Harder | ✅ Easier (real objects) |

---

## Revert ConfigInjector Change

Since we don't need it anymore:

```typescript
// framework/core/src/services/configInjector.ts

private resolveInstance<T extends keyof CV>(
  token: T,
  definition: ...,
  context?: Record<string, unknown>,
  resolutionPath: (keyof CV)[] = []
): ResolvedConfigValidator<SV, CV>[T] {
  // ❌ Remove this - not needed!
  // if (process.env.FORKLAUNCH_MODE === 'openapi') {
  //   return {} as ResolvedConfigValidator<SV, CV>[T];
  // }
  
  const injectorArgument = extractArgumentNames(definition.factory)[0];
  // ... rest stays the same
}
```

---

## Testing

### Test 1: Analyze Env Requirements

```bash
cd /Users/rohinbhargava/forklaunch-js

# CLI should detect these from billing-base/registrations.ts:
# - DATABASE_URL (string)
# - DB_NAME (string)
# - DB_HOST (string)
# - DB_USER (string)
# - DB_PASSWORD (string)
# - DB_PORT (number)
# - REDIS_URL (string)
# - PROTOCOL (string)
# - HOST (string)
# - PORT (number)
# - VERSION (string)
# - DOCS_PATH (string)
# - OTEL_SERVICE_NAME (string)
# - OTEL_LEVEL (string)
# - JWKS_PUBLIC_KEY_URL (string)
# - NODE_ENV (string)
```

### Test 2: Generate Dummy Env

```bash
# CLI generates: blueprint/billing-base/.env.local
DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
DB_NAME=dummy
DB_HOST=localhost
DB_USER=dummy
DB_PASSWORD=dummy
DB_PORT=5432
REDIS_URL=redis://localhost:6379
PROTOCOL=http
HOST=localhost
PORT=3000
VERSION=v1
DOCS_PATH=/docs
OTEL_SERVICE_NAME=billing-base
OTEL_LEVEL=info
JWKS_PUBLIC_KEY_URL=http://localhost:3000/jwks
NODE_ENV=development
```

### Test 3: Run Export

```bash
FORKLAUNCH_MODE=openapi \
FORKLAUNCH_OPENAPI_OUTPUT=./test-output.json \
DOTENV_FILE_PATH=./blueprint/billing-base/.env.local \
npx tsx .forklaunch-tmp/test-openapi-runner.ts

# Should:
# 1. Load dummy env vars ✅
# 2. Initialize MikroORM with dummy DB (doesn't actually connect) ✅
# 3. Initialize Redis with dummy URL (doesn't actually connect) ✅
# 4. Register routes ✅
# 5. Generate OpenAPI ✅
# 6. Exit immediately ✅
# 7. No errors! ✅
```

---

## Summary

**This is the cleanest solution**:

1. **CLI analyzes** registration types (reuse existing code!)
2. **CLI generates** dummy .env.local with smart defaults
3. **Framework works** normally with dummy values
4. **App exits** before any actual connections
5. **CLI cleans up** temporary files

**Result**: 
- ✅ No framework modifications
- ✅ Works in CI without Docker
- ✅ Type safe
- ✅ No special cases
- ✅ Reuses existing env detection code!

**This is the way!** 🎉

