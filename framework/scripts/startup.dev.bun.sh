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

NODE_OPTIONS='--import tsx' bun mikro-orm migration:up

bun run app.ts