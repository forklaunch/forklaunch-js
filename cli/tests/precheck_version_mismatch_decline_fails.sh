#!/usr/bin/env bash
set -euo pipefail

TEST_DIR="output/precheck-version-mismatch-decline"
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

# 2) Force manifest cli_version to mismatch the running cargo binary (0.0.0)
MANIFEST=".forklaunch/manifest.toml"
if [[ "$OSTYPE" == darwin* ]]; then
  sed -E -i '' 's/^cli_version[[:space:]]*=[[:space:]]*"[^"]*"/cli_version = "999.0.0"/' "$MANIFEST"
else
  sed -E -i 's/^cli_version[[:space:]]*=[[:space:]]*"[^"]*"/cli_version = "999.0.0"/' "$MANIFEST"
fi

# 3) Trigger a command and decline upgrade; expect non-zero exit
set +e
printf "n\n" | RUST_BACKTRACE=1 cargo run --release depcheck -p app >/dev/null 2>&1
EXIT_CODE=$?
set -e

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "Expected failure when declining version upgrade, but command succeeded" >&2
  exit 1
fi

echo "OK: precheck version mismatch + decline failed as expected"


