if [ -d "output/delete-router" ]; then
    rm -rf output/delete-router
fi

mkdir -p output/delete-router
cd output/delete-router

RUST_BACKTRACE=1 cargo run --release init application router-test-node-application -p . -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init router rtr-test -p router-test-node-application/billing
RUST_BACKTRACE=1 cargo run --release delete router rtr-test -p router-test-node-application/billing -c

cd router-test-node-application

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run --release init application router-test-bun-application -p . -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init router rtr-test -p router-test-bun-application/iam
RUST_BACKTRACE=1 cargo run --release delete router rtr-test -p router-test-bun-application/iam -c

cd router-test-bun-application

bun install
bun run build

cd ..
