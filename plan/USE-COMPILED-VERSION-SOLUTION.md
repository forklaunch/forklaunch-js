# Solution: Use Compiled Version for OpenAPI Export

**Problem**: tsx has issues with MikroORM decorators during transpilation.

**Solution**: Use the **compiled dist version** instead of tsx on source!

---

## The Approach

### Don't Use tsx on Source
```bash
# ❌ This fails
npx tsx server.ts
# Tries to compile entities with decorators → fails
```

### Use Compiled dist Instead
```bash
# ✅ This works
node dist/server.js
# Already compiled, decorators already processed
```

---

## Updated Implementation

### CLI: `cli/src/core/openapi_export.rs`

```rust
pub fn export_all_services(
    app_root: &Path,
    manifest: &ApplicationManifestData,
    dist_path: &Path,
) -> Result<HashMap<String, HashMap<String, Value>>> {
    let mut all_specs = HashMap::new();
    let modules_path = app_root.join(&manifest.modules_path);
    
    // ✅ Ensure dist is built first
    println!("Building services...");
    build_all_services(app_root)?;
    
    // Detect env vars
    let all_env_vars = find_all_env_vars(&modules_path)?;
    
    for project in &manifest.projects {
        if project.r#type != ProjectType::Service {
            continue;
        }
        
        let output_path = dist_path.join(&project.name).join("openapi.json");
        create_dir_all(output_path.parent().unwrap())?;
        
        // Get env vars for this service
        let service_env_vars = all_env_vars.get(&project.name).unwrap_or(&vec![]);
        
        // ✅ Run compiled version with node
        let mut cmd = Command::new("node");
        cmd.arg(format!("dist/modules/{}/server.js", project.name));
        cmd.current_dir(app_root);
        
        // Set OpenAPI mode
        cmd.env("FORKLAUNCH_MODE", "openapi");
        cmd.env("FORKLAUNCH_OPENAPI_OUTPUT", output_path.to_str().unwrap());
        
        // Set all dummy env vars
        for env_var in service_env_vars {
            let dummy_value = generate_dummy_value(&env_var.name, &env_var.var_type);
            cmd.env(&env_var.name, &dummy_value);
        }
        
        let status = cmd.status()?;
        
        if !status.success() {
            bail!("Failed to export OpenAPI for {}", project.name);
        }
        
        // Read versioned output
        let content = read_to_string(&output_path)?;
        let versioned_specs: HashMap<String, Value> = serde_json::from_str(&content)?;
        all_specs.insert(project.name.clone(), versioned_specs);
    }
    
    Ok(all_specs)
}

fn build_all_services(app_root: &Path) -> Result<()> {
    // Detect package manager
    let package_manager = detect_package_manager(app_root)?;
    
    let status = match package_manager {
        PackageManager::Pnpm => {
            Command::new("pnpm")
                .args(&["run", "build"])
                .current_dir(app_root)
                .status()?
        },
        PackageManager::Bun => {
            Command::new("bun")
                .args(&["run", "build"])
                .current_dir(app_root)
                .status()?
        },
        PackageManager::Npm => {
            Command::new("npm")
                .args(&["run", "build"])
                .current_dir(app_root)
                .status()?
        },
    };
    
    if !status.success() {
        bail!("Build failed");
    }
    
    Ok(())
}
```

---

## Benefits

### ✅ No tsx Issues
- Decorators already compiled
- No transpilation errors
- Reliable execution

### ✅ No Framework Changes
- Revert configInjector change
- No special cases
- Clean framework code

### ✅ No File Creation
- Env vars set in Command
- No .env.local
- No cleanup

### ✅ Fast
- Compiled code runs faster
- No on-the-fly compilation
- Efficient

---

## Workflow

```
1. User runs: forklaunch release create --version 1.0.0

2. CLI runs: pnpm run build
   → Compiles all services to dist/

3. For each service, CLI runs:
   node dist/modules/billing-base/server.js
   with env vars:
     FORKLAUNCH_MODE=openapi
     DATABASE_URL=postgresql://dummy:...
     (all other dummy vars)

4. Service:
   - Loads with dummy env vars
   - MikroORM initializes with dummy config
   - Redis client with dummy URL
   - Registers routes
   - listen() called
   - Framework generates OpenAPI
   - Exits immediately

5. CLI reads OpenAPI output

6. Done! ✅
```

---

## Testing

```bash
cd /Users/rohinbhargava/forklaunch-js

# Build first
pnpm run build

# Test with compiled version
FORKLAUNCH_MODE=openapi \
FORKLAUNCH_OPENAPI_OUTPUT=.forklaunch-tmp/test-output.json \
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" \
DB_NAME=dummy \
DB_HOST=localhost \
DB_USER=dummy \
DB_PASSWORD=dummy \
DB_PORT=5432 \
REDIS_URL="redis://localhost:6379" \
PROTOCOL=http \
HOST=localhost \
PORT=3000 \
VERSION=v1 \
DOCS_PATH=/docs \
OTEL_SERVICE_NAME=billing-base \
OTEL_LEVEL=info \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
NODE_ENV=development \
JWKS_PUBLIC_KEY_URL=http://localhost:3000/jwks \
node dist/modules/billing-base/server.js
```

Let me test this:

<function_calls>
<invoke name="run_terminal_cmd">
<parameter name="command">cd /Users/rohinbhargava/forklaunch-js/blueprint && pnpm run build
