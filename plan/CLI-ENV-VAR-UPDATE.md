# CLI Environment Variable Configuration - Complete

## Summary
Updated the ForkLaunch CLI to use environment variables for the platform API endpoint, allowing users to configure custom API URLs for different environments.

## Changes Made

### 1. New Function in `cli/src/constants.rs`
```rust
pub(crate) const DEFAULT_API_URL: &str = "https://api.forklaunch.com";

/// Get the platform API URL from environment variable or use default
pub(crate) fn get_api_url() -> String {
    std::env::var("FORKLAUNCH_API_URL")
        .unwrap_or_else(|_| DEFAULT_API_URL.to_string())
}
```

**Before:**
```rust
pub(crate) const PROD_API_URL: &str = "https://api.forklaunch.com";
```

**After:**
- Constant renamed to `DEFAULT_API_URL`
- New function `get_api_url()` checks environment variable first
- Falls back to default if not set

### 2. Updated All API Calls

All files that make API calls now use `get_api_url()` instead of the constant:

| File | Import Change | Usage Change |
|------|---------------|--------------|
| `integrate.rs` | `PROD_API_URL` → `get_api_url` | `get_api_url()` |
| `release/create.rs` | `PROD_API_URL` → `get_api_url` | `get_api_url()` |
| `deploy/create.rs` | `PROD_API_URL` → `get_api_url` | `get_api_url()` |
| `config/push.rs` | `PROD_API_URL` → `get_api_url` | `get_api_url()` |
| `config/pull.rs` | `PROD_API_URL` → `get_api_url` | `get_api_url()` |

### 3. Files Modified

**Modified:**
- `cli/src/constants.rs` - Added `get_api_url()` function
- `cli/src/integrate.rs` - Use `get_api_url()`
- `cli/src/release/create.rs` - Use `get_api_url()`
- `cli/src/deploy/create.rs` - Use `get_api_url()`
- `cli/src/config/push.rs` - Use `get_api_url()`
- `cli/src/config/pull.rs` - Use `get_api_url()`
- `docs/cli/release-and-deploy.md` - Added environment variable documentation

## Usage

### Default Behavior (Production)
```bash
# Uses default: https://api.forklaunch.com
forklaunch integrate --app app-123
forklaunch release create --version 1.0.0
forklaunch deploy create --release 1.0.0 --environment production --region us-east-1
```

### Custom API URL (Development/Staging)
```bash
# Point to local development server
export FORKLAUNCH_API_URL=http://localhost:3001/api/v1
forklaunch integrate --app app-123

# Point to staging environment
export FORKLAUNCH_API_URL=https://staging-api.forklaunch.io
forklaunch release create --version 1.0.0-beta

# Point to custom deployment
export FORKLAUNCH_API_URL=https://custom.company.com/forklaunch-api
forklaunch deploy create --release 1.0.0 --environment production --region us-east-1
```

### Per-Command Override
```bash
# Override for single command
FORKLAUNCH_API_URL=http://localhost:3001/api/v1 forklaunch integrate --app app-123

# Or set in shell profile for persistent override
echo 'export FORKLAUNCH_API_URL=http://localhost:3001/api/v1' >> ~/.zshrc
source ~/.zshrc
```

## Environment Variable Reference

| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| `FORKLAUNCH_API_URL` | Platform API endpoint | `https://api.forklaunch.com` | `http://localhost:3001/api/v1` |
| `FORKLAUNCH_TOKEN` | Auth token (from login) | None | `eyJ0eXAiOiJKV1...` |

## Use Cases

### 1. Local Development
```bash
# Test against local platform
export FORKLAUNCH_API_URL=http://localhost:3001/api/v1
forklaunch integrate --app local-app-id
```

### 2. Staging Environment
```bash
# Deploy to staging platform
export FORKLAUNCH_API_URL=https://staging-api.forklaunch.io
forklaunch deploy create --release 1.0.0-rc.1 --environment staging --region us-east-1
```

### 3. Enterprise/Self-Hosted
```bash
# Use enterprise self-hosted platform
export FORKLAUNCH_API_URL=https://forklaunch.internal.company.com/api
forklaunch release create --version 2.0.0
```

### 4. Multi-Environment Workflow
```bash
# Development
export FORKLAUNCH_API_URL=http://localhost:3001/api/v1
forklaunch release create --version 1.0.0-dev --dry-run

# Staging
export FORKLAUNCH_API_URL=https://staging-api.forklaunch.io
forklaunch release create --version 1.0.0-rc.1

# Production
export FORKLAUNCH_API_URL=https://api.forklaunch.com
forklaunch release create --version 1.0.0
```

## Benefits

### Flexibility
- ✅ Support for multiple environments (dev, staging, prod)
- ✅ Self-hosted deployments
- ✅ Enterprise installations
- ✅ Testing against local platform

### Developer Experience
- ✅ No code changes needed for different environments
- ✅ Standard environment variable pattern
- ✅ Easy CI/CD integration
- ✅ Backward compatible (defaults to production)

### Security
- ✅ Can point to internal/private APIs
- ✅ No hardcoded URLs for sensitive deployments
- ✅ Environment-specific authentication

## CI/CD Integration

### GitHub Actions
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup ForkLaunch CLI
        run: npm install -g forklaunch
      
      - name: Deploy
        env:
          FORKLAUNCH_API_URL: https://staging-api.forklaunch.io
          FORKLAUNCH_TOKEN: ${{ secrets.FORKLAUNCH_STAGING_TOKEN }}
        run: |
          forklaunch release create --version ${{ github.sha }}
          forklaunch deploy create --release ${{ github.sha }} --environment staging --region us-east-1
```

### GitLab CI
```yaml
deploy:staging:
  stage: deploy
  variables:
    FORKLAUNCH_API_URL: "https://staging-api.forklaunch.io"
  script:
    - forklaunch release create --version ${CI_COMMIT_SHA}
    - forklaunch deploy create --release ${CI_COMMIT_SHA} --environment staging --region us-east-1
```

## Testing

```bash
# Test with local API
export FORKLAUNCH_API_URL=http://localhost:3001/api/v1

# Verify it's using the correct URL (check logs or network traffic)
forklaunch integrate --app test-id

# Should connect to http://localhost:3001/api/v1/applications/test-id
```

## Build Status

✅ **Compilation**: Successful (4.66s)  
⚠️  **Warnings**: 2 dead code warnings (expected, harmless)

## Documentation Updates

Updated `docs/cli/release-and-deploy.md` to include:
- Environment variable configuration section
- Example usage for different environments
- CI/CD integration examples

## Migration Guide

### For Existing Users
No changes required! The CLI will continue to use the default production API URL (`https://api.forklaunch.com`) unless you set the environment variable.

### For Custom Deployments
Set the environment variable before running commands:
```bash
export FORKLAUNCH_API_URL=your-custom-url
```

## Summary

**Total Changes**: 7 files modified
- `constants.rs` - Added `get_api_url()` function
- 6 files - Updated to use `get_api_url()` instead of constant
- Documentation updated with environment variable usage

The CLI is now fully configurable for any environment while maintaining backward compatibility!

