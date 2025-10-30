#!/usr/bin/env bash

# E2E test for sync library subcommand
# Tests syncing a specific library to all artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NAME="sync-library-subcommand"
OUTPUT_DIR="$SCRIPT_DIR/output/$TEST_NAME"

echo "[TEST] sync library subcommand"

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

# Initialize first library
forklaunch init library shared-types \
    --path . > /dev/null 2>&1

# Manually create a second library directory
mkdir -p src/modules/common-utils
cp -r src/modules/shared-types/* src/modules/common-utils/
sed -i.bak 's/"shared-types"/"common-utils"/g' src/modules/common-utils/package.json
rm -f src/modules/common-utils/package.json.bak

# Test 1: Library directory exists but not in manifest
if [ -d "src/modules/common-utils" ]; then
    echo "[PASS] Library directory created"
else
    echo "[FAIL] Library directory not found"
    exit 1
fi

if ! grep -q "common-utils" .forklaunch/manifest.toml; then
    echo "[PASS] Library not yet in manifest (expected)"
else
    echo "[FAIL] Library should not be in manifest yet"
    exit 1
fi

# Test 2: Sync specific library with prompts
PROMPTS_JSON='{"common-utils": {"description": "Common utilities library"}}'

if forklaunch sync library common-utils --path . --prompts "$PROMPTS_JSON" > /dev/null 2>&1; then
    echo "[PASS] Sync library command executed"
else
    echo "[FAIL] Sync library command failed"
    exit 1
fi

# Test 3: Verify library added to manifest
if grep -q "common-utils" .forklaunch/manifest.toml; then
    echo "[PASS] Library added to manifest"
else
    echo "[FAIL] Library NOT in manifest"
    cat .forklaunch/manifest.toml
    exit 1
fi

# Test 4: Verify library added to runtime files (not docker-compose - libraries don't go there)
if grep -q "common-utils" pnpm-workspace.yaml; then
    echo "[PASS] Library added to pnpm-workspace"
else
    echo "[FAIL] Library NOT in pnpm-workspace"
    cat pnpm-workspace.yaml
    exit 1
fi

# Test 5: Verify library NOT in docker-compose (libraries are code-only, no services)
if ! grep -q "common-utils" docker-compose.yaml; then
    echo "[PASS] Library correctly NOT in docker-compose"
else
    echo "[FAIL] Library should NOT be in docker-compose"
    exit 1
fi

# Test 6: Idempotency check
if forklaunch sync library common-utils --path . --prompts "$PROMPTS_JSON" > /dev/null 2>&1; then
    echo "[PASS] Sync is idempotent"
else
    echo "[FAIL] Sync should be idempotent"
    exit 1
fi

# Test 7: Non-existent library handling
if ! forklaunch sync library nonexistent --path . 2>&1 | grep -q "not found"; then
    echo "[FAIL] Should fail for non-existent library"
    exit 1
else
    echo "[PASS] Fails gracefully for non-existent library"
fi

echo "[SUCCESS] All sync library tests passed"




