mkdir -p output/service
cd output/service

RUST_BACKTRACE=1 cargo run init application service-test-node-application -d postgresql -v zod -f express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init service service-test-postgresql -p service-test-node-application -d postgresql
RUST_BACKTRACE=1 cargo run init service service-test-mongodb -p service-test-node-application -d mongodb

cd service-test-node-application
rm -rf service-test

RUST_BACKTRACE=1 cargo run init service service-test-postgresql -d postgresql

cd ..

RUST_BACKTRACE=1 cargo run init application service-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init service service-test-postgresql -p service-test-bun-application -d postgresql
RUST_BACKTRACE=1 cargo run init service service-test-mongodb -p service-test-bun-application -d mongodb

cd service-test-bun-application
rm -rf service-test

RUST_BACKTRACE=1 cargo run init service service-test-postgresql -d postgresql
