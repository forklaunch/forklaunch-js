if [ -d "output/init-library" ]; then
    rm -rf output/init-library
fi

mkdir -p output/init-library
cd output/init-library

RUST_BACKTRACE=1 cargo run init application library-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test library" -A "Rohin Bhargava" -L 'apgl'
RUST_BACKTRACE=1 cargo run init library library-test -p library-test-node-application -D "Test library"

cd library-test-node-application
rm -rf library-test

RUST_BACKTRACE=1 cargo run init library library-test -D "Test service" -p .

cd ..

RUST_BACKTRACE=1 cargo run init application library-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -s billing -s iam -D "Test library" -A "Rohin Bhargava" -L 'apgl'
RUST_BACKTRACE=1 cargo run init library library-test -p library-test-bun-application -D "Test library"

cd library-test-bun-application
rm -rf library-test

RUST_BACKTRACE=1 cargo run init library library-test -D "Test library" -p .

