if [ -d "output/init-router" ]; then
    rm -rf output/init-router
fi

mkdir -p output/init-router
cd output/init-router

RUST_BACKTRACE=1 cargo run --release init application router-test-node-application -p . -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init router rtr-test -p router-test-node-application/billing

cd router-test-node-application/billing

RUST_BACKTRACE=1 cargo run --release init router rtr-test-two

pnpm install
pnpm build

cd ../..

RUST_BACKTRACE=1 cargo run --release init application router-test-bun-application -p . -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init router rtr-test -p router-test-bun-application/iam

cd router-test-bun-application/iam

RUST_BACKTRACE=1 cargo run --release init router rtr-test-two

bun install
bun run build
