if [ -d "output/eject" ]; then
    rm -rf output/eject
fi

mkdir -p output/eject
cd output/eject

RUST_BACKTRACE=1 cargo run --release init application service-test-node-application -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd service-test-node-application

pnpm install

cd iam

RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-iam-base -d @forklaunch/interfaces-iam -n
RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-iam-base -d @forklaunch/interfaces-iam -c

pnpm build

cd ../..

RUST_BACKTRACE=1 cargo run --release init application service-test-bun-application -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"

cd service-test-bun-application

bun install

cd billing

RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-billing-base -d @forklaunch/interfaces-billing -d @forklaunch/infrastructure-redis -n
RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-billing-base -d @forklaunch/interfaces-billing -d @forklaunch/infrastructure-redis -c

bun run build

cd ../..
