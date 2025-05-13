# docker is needed for this
if [ -d "output/init-compile" ]; then
    rm -rf output/init-compile
fi

mkdir -p output/init-compile
cd output/init-compile

RUST_BACKTRACE=1 cargo run --release init application compile-test-node-application -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init worker worker-test-cache -t redis -p compile-test-node-application -D "Test worker"
RUST_BACKTRACE=1 cargo run --release init router router-test -p compile-test-node-application/billing

cd compile-test-node-application

pnpm install
pnpm build
pnpm database:setup

docker compose -p compile-test-node-application down

cd ..

RUST_BACKTRACE=1 cargo run --release init application compile-test-bun-application -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init worker worker-test -t database -d postgresql -p compile-test-bun-application -D "Test worker"
RUST_BACKTRACE=1 cargo run --release init router router-test -p compile-test-bun-application/billing

cd compile-test-bun-application

bun install
bun run build
bun database:setup

docker compose -p compile-test-bun-application down