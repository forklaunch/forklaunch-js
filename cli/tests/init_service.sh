if [ -d "output/init-service" ]; then
    rm -rf output/init-service
fi

mkdir -p output/init-service
cd output/init-service

RUST_BACKTRACE=1 cargo run --release init application service-test-node-application -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -p service-test-node-application -D "Test service"
RUST_BACKTRACE=1 cargo run --release init service svc-test-mongodb -d mongodb -p service-test-node-application -D "Test service"

cd service-test-node-application
RUST_BACKTRACE=1 cargo run --release delete service svc-test -c

RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -D "Test service" -p .

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run --release init application service-test-bun-application -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -p service-test-bun-application -D "Test service"
RUST_BACKTRACE=1 cargo run --release init service svc-test-mongodb -d mongodb -p service-test-bun-application -D "Test service"

cd service-test-bun-application
RUST_BACKTRACE=1 cargo run --release delete service svc-test -c

RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -D "Test service" -p .

bun install
bun run build
