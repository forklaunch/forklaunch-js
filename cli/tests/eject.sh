if [ -d "output/eject" ]; then
    rm -rf output/eject
fi

mkdir -p output/eject
cd output/eject

RUST_BACKTRACE=1 cargo run init application service-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl'

cd service-test-node-application

pnpm install

cd iam

RUST_BACKTRACE=1 cargo run eject -c

pnpm build

cd ../..

RUST_BACKTRACE=1 cargo run init application service-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L "mit"

cd service-test-bun-application

bun install

cd billing

RUST_BACKTRACE=1 cargo run eject -c

bun run build

cd ../..
