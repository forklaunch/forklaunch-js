mkdir -p output/service
cd output/service

RUST_BACKTRACE=1 cargo run init application service-test-node-application -v zod -f express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init service service-test -p service-test-node-application

cd service-test-node-application
rm -rf service-test

RUST_BACKTRACE=1 cargo run init service service-test

cd ..

RUST_BACKTRACE=1 cargo run init application service-test-bun-application -v zod -f express -r bun -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init service service-test -p service-test-bun-application

cd service-test-bun-application
rm -rf service-test

RUST_BACKTRACE=1 cargo run init service service-test
