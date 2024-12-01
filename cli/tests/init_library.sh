mkdir -p output/library
cd output/library

RUST_BACKTRACE=1 cargo run init application library-test-application -v zod -f express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init library library-test -p library-test-application

cd library-test-application
rm -rf library-test

RUST_BACKTRACE=1 cargo run init library library-test

