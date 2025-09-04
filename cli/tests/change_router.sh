if [ -d "output/change-router" ]; then
    rm -rf output/change-router
fi

mkdir -p output/change-router
cd output/change-router

RUST_BACKTRACE=1 cargo run --release init application change-router-test-node-application -p ./change-router-test-node-application -o source -d postgresql -f prettier -l eslint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test router" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init service svc -d postgresql -p change-router-test-node-application/src/modules -D "Test service"
RUST_BACKTRACE=1 cargo run --release init router rtr -p change-router-test-node-application/src/modules/svc

cd change-router-test-node-application/src/modules

RUST_BACKTRACE=1 cargo run --release change router -p svc -e rtr -N newrtr -c

bun install
bun run build