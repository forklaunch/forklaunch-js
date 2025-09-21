if [ -d "output/sync-application" ]; then
    rm -rf output/sync-application
fi

mkdir -p output/sync-application
cd output/sync-application

RUST_BACKTRACE=1 cargo run --release init application sync-test-node-application -p ./sync-test-node-application -o src/modules -d postgresql -m billing-base -m iam-base -f prettier -l eslint -v zod -F express -r node -t vitest -D "Test Sync Application" -A "Mushroom Research" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-test -p ./sync-test-node-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release delete library lib-test -p ./sync-test-node-application -c
RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -D "Test service"

cd src/modules
RUST_BACKTRACE=1 cargo run --release init worker wrk-test -t database -d postgresql -D "Test worker"


rm -rf iam wrk-test svc-test

cd ../..
RUST_BACKTRACE=1 cargo run --release sync -p ./sync-test-node-application -c

cd src/modules

pnpm install
pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application sync-test-bun-application -p ./sync-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test Sync Application" -A "Mushroom Research" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-test -p ./sync-test-bun-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release delete library lib-test -p ./sync-test-bun-application -c
RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -D "Test service"

cd src/modules
RUST_BACKTRACE=1 cargo run --release init worker wrk-test -t database -d postgresql -D "Test worker"


rm -rf iam wrk-test svc-test

cd ../../..
RUST_BACKTRACE=1 cargo run --release sync -p ./sync-test-bun-application -c

cd src/modules

bun install
bun run build

cd ../../..