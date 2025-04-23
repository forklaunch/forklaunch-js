if [ -d "output/init-service" ]; then
    rm -rf output/init-service
fi

mkdir -p output/init-service
cd output/init-service

RUST_BACKTRACE=1 cargo run init application service-test-node-application -d postgresql -v zod -F express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl'
RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -p service-test-node-application -D "Test service"
RUST_BACKTRACE=1 cargo run init service service-test-mongodb -d mongodb -p service-test-node-application -D "Test service"

cd service-test-node-application
rm -rf service-test

RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -D "Test service" -p .

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run init application service-test-bun-application -d postgresql -v zod -F express -r bun -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L "mit"
RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -p service-test-bun-application -D "Test service"
RUST_BACKTRACE=1 cargo run init service service-test-mongodb -d mongodb -p service-test-bun-application -D "Test service"

cd service-test-bun-application
rm -rf service-test

RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -D "Test service" -p .

bun install
bun run build
