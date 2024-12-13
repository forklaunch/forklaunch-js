#!/bin/sh

set -e

set -a
if [ -f "../$1" ]; then
    source ../$1
fi

if [ -f "$1" ]; then
    source $1
fi
set +a

NODE_OPTIONS='--import tsx' {{#is_node}}pnpm{{/is_node}}{{#is_bun}}bunx{{/is_bun}} mikro-orm migration:up

{{#is_node}}pnpm tsx watch{{/is_node}}{{#is_bun}}bun --watch{{/is_bun}} app.ts