if [ -d "output/delete-library" ]; then
    rm -rf output/delete-library
fi

mkdir -p output/delete-library
cd output/delete-library

RUST_BACKTRACE=1 cargo run --release init application library-test-node-application -p library-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-test -p library-test-node-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release delete library lib-test -p library-test-node-application -c

cd library-test-node-application/src/modules

pnpm install
pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application library-test-bun-application -p library-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-test -p library-test-bun-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release delete library lib-test -p library-test-bun-application -c

cd library-test-bun-application/src/modules

bun install --trusted
bun pm trust --all
bun run build

cd ../../..