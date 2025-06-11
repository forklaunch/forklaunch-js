mkdir -p output/depcheck
cd output/depcheck

RUST_BACKTRACE=1 cargo run --release init application depcheck-test-node-application -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -s billing-base -s iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library library-test -p depcheck-test-node-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release init service service-test -d postgresql -p depcheck-test-node-application -D "Test service"
RUST_BACKTRACE=1 cargo run --release depcheck -p depcheck-test-node-application

RUST_BACKTRACE=1 cargo run --release init application depcheck-test-bun-application -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -s billing-base -s iam-base -D "Test service" -A "Rohin Bhargava" -L "MIT"
RUST_BACKTRACE=1 cargo run --release init library library-test -p depcheck-test-bun-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release init service service-test -d postgresql -p depcheck-test-bun-application -D "Test service"
RUST_BACKTRACE=1 cargo run --release depcheck -p depcheck-test-bun-application
