# docker is needed for this
if [ -d "output/init-compile" ]; then
    rm -rf output/init-compile
fi

mkdir -p output/init-compile
cd output/init-compile

RUST_BACKTRACE=1 cargo run init application compile-test-node-application -d postgresql -v zod -F express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl'
RUST_BACKTRACE=1 cargo run init worker worker-test-cache -b cache -p compile-test-node-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init router router-test -p compile-test-node-application/billing

cd compile-test-node-application

pnpm install
pnpm build
pnpm migrate:init
pnpm migrate:up
pnpm seed

docker compose -p compile-test-node-application down

cd ..

RUST_BACKTRACE=1 cargo run init application compile-test-bun-application -d postgresql -v zod -F express -r bun -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L "mit"
RUST_BACKTRACE=1 cargo run init worker worker-test -b database -p compile-test-bun-application -D "Test worker"
RUST_BACKTRACE=1 cargo run init router router-test -p compile-test-bun-application/billing

cd compile-test-bun-application

bun install
bun run build
bun migrate:init
bun migrate:up
bun seed

docker compose -p compile-test-bun-application down