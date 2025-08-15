if [ -d "output/init-module" ]; then
    rm -rf output/init-module
fi

mkdir -p output/init-module
cd output/init-module

RUST_BACKTRACE=1 cargo run --release init application module-test-src-path -p ./module-test-src-path -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -D "Test service" -A "ForkLaunch" -L 'AGPL-3.0'
mkdir -p module-test-src-path/src
RUST_BACKTRACE=1 cargo run --release init module -m iam-base -d postgresql -p ./module-test-src-path
RUST_BACKTRACE=1 cargo run --release init module -m billing-base -d postgresql -p ./module-test-src-path

cd module-test-src-path

pnpm install
pnpm build

cd ..

RUST_BACKTRACE=1 cargo run --release init application module-test-no-src-path -p ./module-test-no-src-path -d postgresql -f biome -l oxlint -v zod -F express -r node -t vitest -D "Test service" -A "ForkLaunch" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init module -m iam-base -d postgresql -p module-test-no-src-path -f modules
RUST_BACKTRACE=1 cargo run --release init module -m billing-base -d postgresql -p module-test-no-src-path -f modules

cd module-test-no-src-path

pnpm install
pnpm build

cd ..