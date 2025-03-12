if [ -d "output/init-router" ]; then
    rm -rf output/init-router
fi

mkdir -p output/init-router
cd output/init-router

RUST_BACKTRACE=1 cargo run init application router-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl'
RUST_BACKTRACE=1 cargo run init router router-test -p router-test-node-application/billing

cd router-test-node-application/billing

RUST_BACKTRACE=1 cargo run init router router-test-2

cd ../..

RUST_BACKTRACE=1 cargo run init application router-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L "mit"
RUST_BACKTRACE=1 cargo run init router router-test -p router-test-bun-application/iam

cd router-test-bun-application/iam

RUST_BACKTRACE=1 cargo run init router router-test-2
