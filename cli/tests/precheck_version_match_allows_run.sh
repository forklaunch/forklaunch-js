#!/usr/bin/env bash
set -euo pipefail

# Ensure a clean workspace for this test
TEST_DIR="output/precheck-version-match"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# 1) Create a new application
RUST_BACKTRACE=1 cargo run --release init application app \
  -p . \
  -o modules \
  -d postgresql \
  -f prettier \
  -l eslint \
  -v zod \
  -F express \
  -r node \
  -t vitest \
  -m billing-base \
  -m iam-base \
  -D "Test app" \
  -A "Test Author" \
  -L 'AGPL-3.0'

# 2) Force manifest cli_version to match the running cargo binary (0.0.0)
MANIFEST=".forklaunch/manifest.toml"
if [[ "$OSTYPE" == darwin* ]]; then
  sed -E -i '' 's/^cli_version[[:space:]]*=[[:space:]]*"[^"]*"/cli_version = "0.0.0"/' "$MANIFEST"
else
  sed -E -i 's/^cli_version[[:space:]]*=[[:space:]]*"[^"]*"/cli_version = "0.0.0"/' "$MANIFEST"
fi

# 3) Run a command that triggers precheck; expect no prompt and success
RUST_BACKTRACE=1 cargo run --release depcheck -p .

echo "OK: precheck version match allowed command to run"


