rm -rf output/init-application-custom-path

mkdir -p output/init-application-custom-path
cd output/init-application-custom-path

RUST_BACKTRACE=1 cargo run --release init application "test-app-current" \
    --path "." \
    -o "src/modules" \
    -d "postgresql" \
    -v "zod" \
    -f "prettier" \
    -l "eslint" \
    -F "express" \
    -r "node" \
    -t "vitest" \
    -m "billing-base" \
    -m "iam-base" \
    -D "Test application" \
    -A "Test User" \
    -L "MIT"

cd src/modules

pnpm install
pnpm build

cd ../..

RUST_BACKTRACE=1 cargo run --release init application "test-app-custom" \
    --path "custom-test-path" \
    -o "modules" \
    -d "postgresql" \
    -v "zod" \
    -f "prettier" \
    -l "eslint" \
    -F "express" \
    -r "node" \
    -t "vitest" \
    -m "billing-base" \
    -m "iam-base" \
    -D "Test application" \
    -A "Test User" \
    -L "MIT"

cd custom-test-path/modules

pnpm install
pnpm build
