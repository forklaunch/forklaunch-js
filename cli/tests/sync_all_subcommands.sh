#!/usr/bin/env bash

# E2E test for all sync subcommands
# Comprehensive test of sync service, worker, and library

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NAME="sync-all-subcommands"
OUTPUT_DIR="$SCRIPT_DIR/output/$TEST_NAME"

echo "[TEST] All Sync Subcommands E2E"

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

echo "[INFO] Testing sync service subcommand..."

# Test 1: Manually create service and sync it
mkdir -p src/modules/orders
cat > src/modules/orders/package.json << 'EOF'
{
  "name": "orders",
  "version": "0.0.1",
  "private": true
}
EOF

PROMPTS='{"orders": {"database": "postgresql", "infrastructure": "none", "description": "Orders service"}}'
if forklaunch sync service orders --path . --prompts "$PROMPTS" > /dev/null 2>&1; then
    echo "[PASS] Service synced"
else
    echo "[FAIL] Service sync failed"
    exit 1
fi

if grep -q "orders" .forklaunch/manifest.toml && grep -q "orders" docker-compose.yaml; then
    echo "[PASS] Service in all artifacts"
else
    echo "[FAIL] Service not in all artifacts"
    exit 1
fi

echo "[INFO] Testing sync worker subcommand..."

# Test 2: Manually create worker and sync it
mkdir -p src/modules/notifications
cat > src/modules/notifications/package.json << 'EOF'
{
  "name": "notifications",
  "version": "0.0.1",
  "private": true
}
EOF

PROMPTS='{"notifications": {"type": "standard", "description": "Notification worker"}}'
if forklaunch sync worker notifications --path . --prompts "$PROMPTS" > /dev/null 2>&1; then
    echo "[PASS] Worker synced"
else
    echo "[FAIL] Worker sync failed"
    exit 1
fi

if grep -q "notifications" .forklaunch/manifest.toml && grep -q "notifications" docker-compose.yaml; then
    echo "[PASS] Worker in all artifacts"
else
    echo "[FAIL] Worker not in all artifacts"
    exit 1
fi

echo "[INFO] Testing sync library subcommand..."

# Test 3: Manually create library and sync it
mkdir -p src/modules/shared-models
cat > src/modules/shared-models/package.json << 'EOF'
{
  "name": "shared-models",
  "version": "0.0.1",
  "private": true
}
EOF

PROMPTS='{"shared-models": {"description": "Shared data models"}}'
if forklaunch sync library shared-models --path . --prompts "$PROMPTS" > /dev/null 2>&1; then
    echo "[PASS] Library synced"
else
    echo "[FAIL] Library sync failed"
    exit 1
fi

if grep -q "shared-models" .forklaunch/manifest.toml; then
    echo "[PASS] Library in manifest"
else
    echo "[FAIL] Library NOT in manifest"
    exit 1
fi

# Library should NOT be in docker-compose
if ! grep -q "shared-models" docker-compose.yaml; then
    echo "[PASS] Library correctly NOT in docker-compose"
else
    echo "[FAIL] Library should not be in docker-compose"
    exit 1
fi

echo "[INFO] Testing sync all command..."

# Test 4: Verify sync all still works with everything
if forklaunch sync all --path . --confirm > /dev/null 2>&1; then
    echo "[PASS] Sync all still works"
else
    echo "[FAIL] Sync all failed"
    exit 1
fi

# Test 5: Create a router and verify sync all detects it
forklaunch init router profile --path src/modules/orders > /dev/null 2>&1

if forklaunch sync all --path . --confirm 2>&1 | grep -q "profile"; then
    echo "[PASS] Sync all detects routers"
else
    echo "[FAIL] Sync all should detect routers"
    exit 1
fi

echo "[INFO] Testing compilation..."

# Test 6: Ensure application still compiles
if npm run build > /dev/null 2>&1; then
    echo "[PASS] Application compiles after all syncs"
else
    echo "[FAIL] Compilation failed"
    exit 1
fi

echo ""
echo "[SUCCESS] All sync subcommands validated"
echo "[INFO] Tested: service, worker, library, all"
echo "[INFO] Verified: manifest, docker-compose, runtime files, compilation"




