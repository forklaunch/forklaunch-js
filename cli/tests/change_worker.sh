if [ -d "output/change-worker" ]; then
    rm -rf output/change-worker
fi

mkdir -p output/change-worker
cd output/change-worker

RUST_BACKTRACE=1 cargo run --release init application change-worker-test-node-application -d postgresql -f prettier -l eslint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test worker" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init worker workr -t database -d postgresql -p change-worker-test-node-application -D "Test worker"

cd change-worker-test-node-application

RUST_BACKTRACE=1 cargo run --release change worker -p workr -N newworkr -t bullmq -D "Test worker 2" -c

bun install
bun run build