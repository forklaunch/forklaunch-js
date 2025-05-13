if [ -d "output/init-worker" ]; then
    rm -rf output/init-worker
fi

mkdir -p output/init-worker
cd output/init-worker

RUST_BACKTRACE=1 cargo run init application worker-test-node-application -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -s billing -s iam -D "Test worker" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run init worker worker-test -t database -d postgresql -p worker-test-node-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-redis -t redis -p worker-test-node-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-bullmq -t bullmq -p worker-test-node-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-kafka -t kafka -p worker-test-node-application -D "Test worker"

cd worker-test-node-application
rm -rf worker-test

RUST_BACKTRACE=1 cargo run init worker worker-test -t database -d postgresql -D "Test worker" -p .

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run init application worker-test-bun-application -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -s billing -s iam -D "Test worker" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run init worker worker-test -t database -d postgresql -p worker-test-bun-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-redis -t redis -p worker-test-bun-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-bullmq -t bullmq -p worker-test-bun-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-kafka -t kafka -p worker-test-bun-application -D "Test worker"

cd worker-test-bun-application
rm -rf worker-test

RUST_BACKTRACE=1 cargo run init worker worker-test -t database -d postgresql -D "Test worker" -p .

bun install
bun run build
