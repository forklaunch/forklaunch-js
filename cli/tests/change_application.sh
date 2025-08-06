if [ -d "output/change-application" ]; then
    rm -rf output/change-application
fi

mkdir -p output/change-application
cd output/change-application

RUST_BACKTRACE=1 cargo run --release init application change-application-test-node-application -p . -d postgresql -f prettier -l eslint -v zod -F hyper-express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd change-application-test-node-application

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run --release change application -p change-application-test-node-application -N change-application-test-bun-application -f biome -l oxlint -v typebox -F express -r bun -t jest -D "Test service 2" -A "Rohin Bhargava A" -L "MIT" -c

cd change-application-test-bun-application

bun install
bun run build
