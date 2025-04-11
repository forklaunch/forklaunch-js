if [ -d "output/init-worker" ]; then
    rm -rf output/init-worker
fi

mkdir -p output/init-worker
cd output/init-worker

RUST_BACKTRACE=1 cargo run init application worker-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test worker" -A "Rohin Bhargava" -L 'apgl'
RUST_BACKTRACE=1 cargo run init worker worker-test -b database -p worker-test-node-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-cache -b cache -p worker-test-node-application -D "Test worker"

cd worker-test-node-application
rm -rf worker-test

RUST_BACKTRACE=1 cargo run init worker worker-test -b database -D "Test worker" -p .

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run init application worker-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -s billing -s iam -D "Test worker" -A "Rohin Bhargava" -L "mit"
RUST_BACKTRACE=1 cargo run init worker worker-test -b database -p worker-test-bun-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init worker worker-test-cache -b cache -p worker-test-bun-application -D "Test worker"

cd worker-test-bun-application
rm -rf worker-test

RUST_BACKTRACE=1 cargo run init worker worker-test -b database -D "Test worker" -p .

bun install
bun run build
