#!/usr/bin/env bash

# Integration test for sync command - complete add/remove flow
# Tests that sync correctly detects and synchronizes changes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NAME="sync-add-remove-flow"
OUTPUT_DIR="$SCRIPT_DIR/output/$TEST_NAME"

echo "[TEST] Sync Complete Add/Remove Flow"

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

# Initialize initial service
forklaunch init service users \
    --path . \
    --database postgresql > /dev/null 2>&1

# Test 1: Sync with no changes
if forklaunch sync all --path . --confirm > /dev/null 2>&1; then
    echo "[PASS] Sync with no changes"
else
    echo "[FAIL] Sync failed with no changes"
    exit 1
fi

# Test 2: Create new service manually
mkdir -p src/modules/products
cp -r src/modules/users/* src/modules/products/
sed -i.bak 's/"users"/"products"/g' src/modules/products/package.json

# Test 3: Sync adds new service
PROMPTS_JSON='{"products": {"category": "service", "database": "postgresql", "infrastructure": "none", "description": "Products service"}}'

if forklaunch sync all --path . --confirm --prompts "$PROMPTS_JSON" > /dev/null 2>&1; then
    echo "[PASS] Sync added new service"
else
    echo "[FAIL] Sync failed to add service"
    exit 1
fi

# Test 4: Verify addition to manifest
if grep -q "products" .forklaunch/manifest.toml; then
    echo "[PASS] Service in manifest"
else
    echo "[FAIL] Service NOT in manifest"
    exit 1
fi

# Test 5: Verify addition to docker-compose
if grep -q "products" docker-compose.yaml; then
    echo "[PASS] Service in docker-compose"
else
    echo "[FAIL] Service NOT in docker-compose"
    exit 1
fi

# Test 6: Remove service directory
rm -rf src/modules/products

# Test 7: Sync removes service
if forklaunch sync all --path . --confirm > /dev/null 2>&1; then
    echo "[PASS] Sync removed service"
else
    echo "[FAIL] Sync failed to remove"
    exit 1
fi

# Test 8: Verify removal from manifest
if ! grep -q "products" .forklaunch/manifest.toml; then
    echo "[PASS] Service removed from manifest"
else
    echo "[FAIL] Service still in manifest"
    exit 1
fi

echo "[SUCCESS] Complete sync workflow validated"

