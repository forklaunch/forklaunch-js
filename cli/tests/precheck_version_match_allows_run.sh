#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"

if [[ "$OSTYPE" == darwin* ]]; then
  sed -i '' 's/^version = "0.0.0"/version = "0.5.1"/' "$CLI_DIR/Cargo.toml"
  sed -i '' 's/"version": "0.0.0"/"version": "0.5.1"/' "$CLI_DIR/package.json"
else
  sed -i 's/^version = "0.0.0"/version = "0.5.1"/' "$CLI_DIR/Cargo.toml"
  sed -i 's/"version": "0.0.0"/"version": "0.5.1"/' "$CLI_DIR/package.json"
fi

trap "cd '$CLI_DIR' && git restore Cargo.toml package.json" EXIT

TEST_DIR="output/precheck-version-match"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

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

MANIFEST=".forklaunch/manifest.toml"
if [[ "$OSTYPE" == darwin* ]]; then
  sed -E -i '' 's/^cli_version[[:space:]]*=[[:space:]]*"[^"]*"/cli_version = "0.5.1"/' "$MANIFEST"
else
  sed -E -i 's/^cli_version[[:space:]]*=[[:space:]]*"[^"]*"/cli_version = "0.5.1"/' "$MANIFEST"
fi

RUST_BACKTRACE=1 cargo run --release depcheck -p .

echo "OK: precheck version match allowed command to run"
