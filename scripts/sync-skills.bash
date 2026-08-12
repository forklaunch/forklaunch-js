#!/bin/bash
# Syncs the ForkLaunch skill pack (`fl context`) from the canonical source in
# forklaunch-platform/.claude/skills into cli/assets/forklaunch-skills.
#
# Usage:
#   scripts/sync-skills.bash            # copy allowlisted skills, update source_commit
#   scripts/sync-skills.bash --check    # no writes; report drift and exit 1 if any
#
# The source is a sibling checkout by default. Override with SKILLS_SOURCE_DIR
# if forklaunch-platform lives elsewhere.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(cd "$SCRIPT_DIR/../cli" && pwd)"
DEST="$CLI_DIR/assets/forklaunch-skills"
MANIFEST="$CLI_DIR/assets/skills.toml"
SOURCE_DIR="${SKILLS_SOURCE_DIR:-$SCRIPT_DIR/../../forklaunch-platform/.claude/skills}"

CHECK=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK=true
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "error: source skills directory not found at $SOURCE_DIR" >&2
  echo "set SKILLS_SOURCE_DIR to the path of forklaunch-platform/.claude/skills" >&2
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: manifest not found at $MANIFEST" >&2
  exit 1
fi

INCLUDE=()
while IFS= read -r entry; do
  INCLUDE+=("$entry")
done < <(sed -n '/^include = \[/,/^\]/p' "$MANIFEST" | grep -oE '"[^"]+"' | tr -d '"')

if [[ ${#INCLUDE[@]} -eq 0 ]]; then
  echo "error: no entries parsed from the include list in $MANIFEST" >&2
  exit 1
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

for entry in "${INCLUDE[@]}"; do
  src="$SOURCE_DIR/$entry"
  if [[ ! -e "$src" ]]; then
    echo "error: '$entry' is in the allowlist but missing from $SOURCE_DIR" >&2
    exit 1
  fi
  cp -R "$src" "$WORKDIR/$entry"
done

SOURCE_SHA=$(git -C "$SOURCE_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")

if $CHECK; then
  DIFF_OUT=$(mktemp)
  trap 'rm -f "$DIFF_OUT"; rm -rf "$WORKDIR"' EXIT
  if diff -rq "$WORKDIR" "$DEST" > "$DIFF_OUT" 2>&1; then
    echo "skill pack is in sync with $SOURCE_DIR"
    exit 0
  else
    echo "skill pack is out of sync with $SOURCE_DIR:" >&2
    cat "$DIFF_OUT" >&2
    exit 1
  fi
else
  rm -rf "$DEST"
  mkdir -p "$DEST"
  cp -R "$WORKDIR"/. "$DEST"/
  sed -i.bak -E "s/^source_commit = \".*\"/source_commit = \"$SOURCE_SHA\"/" "$MANIFEST"
  rm -f "$MANIFEST.bak"
  echo "synced $(find "$DEST" -type f | wc -l | tr -d ' ') files from $SOURCE_DIR@$SOURCE_SHA"
fi
