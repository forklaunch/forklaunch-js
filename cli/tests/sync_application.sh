if [ -d "output/sync-application" ]; then
    rm -rf output/sync-application
fi

mkdir -p output/sync-application
cd output/sync-application

RUST_BACKTRACE=1 cargo run --release init application sync-test-node-application -p . -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test Sync Application" -A "Mushroom Research" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-test -p . -D "Test library"
RUST_BACKTRACE=1 cargo run --release delete library lib-test -p . -c

RUST_BACKTRACE=1 cargo run --release sync application -p .

pnpm install
pnpm build