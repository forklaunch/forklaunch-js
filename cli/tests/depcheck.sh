mkdir -p output/depcheck
cd output/depcheck

RUST_BACKTRACE=1 cargo run init application depcheck-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl'
RUST_BACKTRACE=1 cargo run init library library-test -p depcheck-test-node-application -D "Test library"
RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -p depcheck-test-node-application -D "Test service"
RUST_BACKTRACE=1 cargo run depcheck -p depcheck-test-node-application

RUST_BACKTRACE=1 cargo run init application depcheck-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L "mit"
RUST_BACKTRACE=1 cargo run init library library-test -p depcheck-test-bun-application -D "Test library"
RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -p depcheck-test-bun-application -D "Test service"
RUST_BACKTRACE=1 cargo run depcheck -p depcheck-test-bun-application
