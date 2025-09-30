if [ -d "output/init-library" ]; then
    rm -rf output/init-library
fi

mkdir -p output/init-library
cd output/init-library

RUST_BACKTRACE=1 cargo run --release init application library-test-node-application -p library-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-test -p library-test-node-application -D "Test library"

cd library-test-node-application

RUST_BACKTRACE=1 cargo run --release delete library lib-test -c
RUST_BACKTRACE=1 cargo run --release init library lib-test -D "Test service" -p .

cd src/modules

pnpm install
pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application library-test-bun-application -p library-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-test -p library-test-bun-application -D "Test library"

cd library-test-bun-application

RUST_BACKTRACE=1 cargo run --release delete library lib-test -c
RUST_BACKTRACE=1 cargo run --release init library lib-test -D "Test library" -p .

cd src/modules

bun install --trusted
bun pm trust
bun run build

