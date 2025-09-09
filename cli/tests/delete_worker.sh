if [ -d "output/delete-worker" ]; then
    rm -rf output/delete-worker
fi

mkdir -p output/delete-worker
cd output/delete-worker

RUST_BACKTRACE=1 cargo run --release init application worker-test-node-application -p ./worker-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test worker" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init worker wrk-test -t database -d postgresql -p worker-test-node-application/src/modules -D "Test worker"
RUST_BACKTRACE=1 cargo run --release delete worker wrk-test -p worker-test-node-application/src/modules -c

cd worker-test-node-application/src/modules

pnpm install
pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application worker-test-bun-application -p ./worker-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test worker" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init worker wrk-test -t database -d postgresql -p worker-test-bun-application/src/modules -D "Test worker"
RUST_BACKTRACE=1 cargo run --release delete worker wrk-test -p worker-test-bun-application/src/modules -c

cd worker-test-bun-application/src/modules

bun install
bun run build

cd ../../..