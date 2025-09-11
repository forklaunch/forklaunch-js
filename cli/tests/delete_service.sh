if [ -d "output/delete-service" ]; then
    rm -rf output/delete-service
fi

mkdir -p output/delete-service
cd output/delete-service

RUST_BACKTRACE=1 cargo run --release init application service-test-node-application -p service-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd service-test-node-application

RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -D "Test service"
RUST_BACKTRACE=1 cargo run --release delete service svc-test -c

cd src/modules

pnpm install
pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application service-test-bun-application -p service-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"

cd service-test-bun-application

RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -p . -D "Test service"
RUST_BACKTRACE=1 cargo run --release delete service svc-test -p . -c

cd src/modules

bun install
bun run build

cd ../../..
