mkdir -p output/library
cd output/library

RUST_BACKTRACE=1 cargo run init application library-test-node-application -d postgresql -v zod -f express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init library library-test -p library-test-node-application

cd library-test-node-application
rm -rf library-test

RUST_BACKTRACE=1 cargo run init library library-test

cd ..

RUST_BACKTRACE=1 cargo run init application library-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init library library-test -p library-test-bun-application

cd library-test-bun-application
rm -rf library-test

RUST_BACKTRACE=1 cargo run init library library-test

