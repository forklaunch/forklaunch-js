if [ -d "output/change-router" ]; then
    rm -rf output/change-router
fi

mkdir -p output/change-router
cd output/change-router

RUST_BACKTRACE=1 cargo run init application change-router-test-node-application -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -s billing -s iam -D "Test router" -A "Rohin Bhargava" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run init service svc -d postgresql -p change-router-test-node-application -D "Test service"
RUST_BACKTRACE=1 cargo run init router rtr -p change-router-test-node-application/svc

cd change-router-test-node-application

pnpm install
pnpm build

RUST_BACKTRACE=1 cargo run change router -p svc -e rtr -N newrtr -c

pnpm install
pnpm build