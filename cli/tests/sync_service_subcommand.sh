#!/usr/bin/env bash

# E2E test for sync service subcommand
# Tests syncing a specific service to all artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NAME="sync-service-subcommand"
OUTPUT_DIR="$SCRIPT_DIR/output/$TEST_NAME"

echo "[TEST] sync service subcommand"

# Cleanup
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Create test application
cd "$OUTPUT_DIR"
forklaunch init application test-app \
    --database postgresql \
    --formatter prettier \
    --linter eslint \
    --http-framework express \
    --runtime node \
    --test-framework vitest > /dev/null 2>&1

cd test-app

# Initialize first service
forklaunch init service users \
    --path . \
    --database postgresql > /dev/null 2>&1

# Manually create a second service directory (simulating manual copy)
mkdir -p src/modules/products
cp -r src/modules/users/* src/modules/products/
sed -i.bak 's/"users"/"products"/g' src/modules/products/package.json
rm -f src/modules/products/package.json.bak

# Test 1: Service directory exists but not in manifest
if [ -d "src/modules/products" ]; then
    echo "[PASS] Product service directory created"
else
    echo "[FAIL] Product service directory not found"
    exit 1
fi

if ! grep -q "products" .forklaunch/manifest.toml; then
    echo "[PASS] Products not yet in manifest (expected)"
else
    echo "[FAIL] Products should not be in manifest yet"
    exit 1
fi

# Test 2: Sync specific service with prompts
PROMPTS_JSON='{"products": {"database": "postgresql", "infrastructure": "none", "description": "Products service"}}'

if forklaunch sync service products --path . --prompts "$PROMPTS_JSON" > /dev/null 2>&1; then
    echo "[PASS] Sync service command executed"
else
    echo "[FAIL] Sync service command failed"
    exit 1
fi

# Test 3: Verify service added to manifest
if grep -q "products" .forklaunch/manifest.toml; then
    echo "[PASS] Service added to manifest"
else
    echo "[FAIL] Service NOT in manifest"
    cat .forklaunch/manifest.toml
    exit 1
fi

# Test 4: Verify service added to docker-compose
if grep -q "products" docker-compose.yaml; then
    echo "[PASS] Service added to docker-compose"
else
    echo "[FAIL] Service NOT in docker-compose"
    cat docker-compose.yaml
    exit 1
fi

# Test 5: Verify service added to runtime files (pnpm-workspace for node)
if grep -q "products" pnpm-workspace.yaml; then
    echo "[PASS] Service added to pnpm-workspace"
else
    echo "[FAIL] Service NOT in pnpm-workspace"
    cat pnpm-workspace.yaml
    exit 1
fi

# Test 6: Try syncing same service again (should be idempotent)
if forklaunch sync service products --path . --prompts "$PROMPTS_JSON" > /dev/null 2>&1; then
    echo "[PASS] Sync is idempotent (no error when already synced)"
else
    echo "[FAIL] Sync should be idempotent"
    exit 1
fi

# Test 7: Try syncing non-existent service (should fail gracefully)
if ! forklaunch sync service nonexistent --path . 2>&1 | grep -q "not found"; then
    echo "[FAIL] Should fail for non-existent service"
    exit 1
else
    echo "[PASS] Fails gracefully for non-existent service"
fi

echo "[SUCCESS] All sync service tests passed"




