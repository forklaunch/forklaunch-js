if [ -d "output/change-sdk-mode" ]; then
    rm -rf output/change-sdk-mode
fi

mkdir -p output/change-sdk-mode
cd output/change-sdk-mode

RUST_BACKTRACE=1 cargo run --release init application service-test-node-application -p service-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd service-test-node-application/src/modules

pnpm install

pnpm build

RUST_BACKTRACE=1 cargo run --release sdk mode -t generated

pnpm build

RUST_BACKTRACE=1 cargo run --release sdk mode -t live

pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application service-test-bun-application -p service-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"

cd service-test-bun-application/src/modules

bun install

RUST_BACKTRACE=1 cargo run --release sdk mode -t generated

bun run build

RUST_BACKTRACE=1 cargo run --release sdk mode -t live

bun run build

cd ../../..
