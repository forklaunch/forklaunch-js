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

NODE_OPTIONS='--import tsx' pnpm mikro-orm migration:up --config=mikro-orm.config.ts

pnpx node --import tsx app.ts