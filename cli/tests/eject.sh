if [ -d "output/eject" ]; then
    rm -rf output/eject
fi

mkdir -p output/eject
cd output/eject

RUST_BACKTRACE=1 cargo run --release init application service-test-node-application -p service-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd service-test-node-application/src/modules

pnpm install

cd iam

RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-iam-base -d @forklaunch/interfaces-iam -n

cd ..

RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-iam-base -d @forklaunch/interfaces-iam -p iam -c

pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application service-test-bun-application -p service-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"

cd service-test-bun-application/src/modules

bun install --trusted
bun pm trust

cd billing

RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-billing-base -d @forklaunch/interfaces-billing -d @forklaunch/infrastructure-redis -n

cd ../..

RUST_BACKTRACE=1 cargo run --release eject -d @forklaunch/implementation-billing-base -d @forklaunch/interfaces-billing -d @forklaunch/infrastructure-redis -p modules/billing -c

cd modules

bun run build

cd ../../..
