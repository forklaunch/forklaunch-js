if [ -d "output/delete-service" ]; then
    rm -rf output/delete-service
fi

mkdir -p output/delete-service
cd output/delete-service

RUST_BACKTRACE=1 cargo run --release init application service-test-node-application -p ./service-test-node-application -o source -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -p service-test-node-application/src/modules -D "Test service"
RUST_BACKTRACE=1 cargo run --release delete service svc-test -p service-test-node-application/src/modules -c

cd service-test-node-application

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run --release init application service-test-bun-application -p ./service-test-bun-application -o source -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init service svc-test -d postgresql -p service-test-bun-application/src/modules -D "Test service"
RUST_BACKTRACE=1 cargo run --release delete service svc-test -p service-test-bun-application/src/modules -c

cd service-test-bun-application

bun install
bun run build

cd ..
