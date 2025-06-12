if [ -d "output/change-library" ]; then
    rm -rf output/change-library
fi

mkdir -p output/change-library
cd output/change-library

RUST_BACKTRACE=1 cargo run --release init application change-library-test-node-application -d postgresql -f prettier -l eslint -v zod -F hyper-express -r bun -t vitest -s billing-base -s iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lbry -p change-library-test-node-application -D "Test library"

cd change-library-test-node-application

RUST_BACKTRACE=1 cargo run --release change library -p lbry -N newlbry -D "Test library 2" -c

bun install
bun run build