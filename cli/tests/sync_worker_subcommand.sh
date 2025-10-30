#!/usr/bin/env bash

# E2E test for sync worker subcommand
# Tests syncing a specific worker to all artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NAME="sync-worker-subcommand"
OUTPUT_DIR="$SCRIPT_DIR/output/$TEST_NAME"

echo "[TEST] sync worker subcommand"

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

# Initialize first worker
forklaunch init worker email-sender \
    --path . > /dev/null 2>&1

# Manually create a second worker directory
mkdir -p src/modules/video-processor
cp -r src/modules/email-sender/* src/modules/video-processor/
sed -i.bak 's/"email-sender"/"video-processor"/g' src/modules/video-processor/package.json
rm -f src/modules/video-processor/package.json.bak

# Test 1: Worker directory exists but not in manifest
if [ -d "src/modules/video-processor" ]; then
    echo "[PASS] Worker directory created"
else
    echo "[FAIL] Worker directory not found"
    exit 1
fi

if ! grep -q "video-processor" .forklaunch/manifest.toml; then
    echo "[PASS] Worker not yet in manifest (expected)"
else
    echo "[FAIL] Worker should not be in manifest yet"
    exit 1
fi

# Test 2: Sync specific worker with prompts
PROMPTS_JSON='{"video-processor": {"type": "standard", "description": "Video processing worker"}}'

if forklaunch sync worker video-processor --path . --prompts "$PROMPTS_JSON" > /dev/null 2>&1; then
    echo "[PASS] Sync worker command executed"
else
    echo "[FAIL] Sync worker command failed"
    exit 1
fi

# Test 3: Verify worker added to manifest
if grep -q "video-processor" .forklaunch/manifest.toml; then
    echo "[PASS] Worker added to manifest"
else
    echo "[FAIL] Worker NOT in manifest"
    cat .forklaunch/manifest.toml
    exit 1
fi

# Test 4: Verify worker added to docker-compose
if grep -q "video-processor" docker-compose.yaml; then
    echo "[PASS] Worker added to docker-compose"
else
    echo "[FAIL] Worker NOT in docker-compose"
    cat docker-compose.yaml
    exit 1
fi

# Test 5: Verify worker added to runtime files
if grep -q "video-processor" pnpm-workspace.yaml; then
    echo "[PASS] Worker added to pnpm-workspace"
else
    echo "[FAIL] Worker NOT in pnpm-workspace"
    cat pnpm-workspace.yaml
    exit 1
fi

# Test 6: Idempotency check
if forklaunch sync worker video-processor --path . --prompts "$PROMPTS_JSON" > /dev/null 2>&1; then
    echo "[PASS] Sync is idempotent"
else
    echo "[FAIL] Sync should be idempotent"
    exit 1
fi

# Test 7: Non-existent worker handling
if ! forklaunch sync worker nonexistent --path . 2>&1 | grep -q "not found"; then
    echo "[FAIL] Should fail for non-existent worker"
    exit 1
else
    echo "[PASS] Fails gracefully for non-existent worker"
fi

echo "[SUCCESS] All sync worker tests passed"




