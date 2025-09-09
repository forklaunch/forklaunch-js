if [ -d "output/dryrun" ]; then
    rm -rf output/dryrun
fi

mkdir -p output/dryrun
cd output/dryrun

RUST_BACKTRACE=1 cargo run --release init application dryrun-test-node-application -p ./dryrun-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0' -n

if [ "$(ls -A)" ]; then
     echo "Error: Directory not empty" >&2
     exit 1
fi

RUST_BACKTRACE=1 cargo run --release init application dryrun-test-node-application -p ./dryrun-test-node-application -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-base -m iam-base -D "Test service" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd dryrun-test-node-application/src/modules

RUST_BACKTRACE=1 cargo run --release init library library-test -D "Test service" -p . -n
RUST_BACKTRACE=1 cargo run --release init service service-test -d postgresql -D "Test service" -p . -n
RUST_BACKTRACE=1 cargo run --release init worker worker-test -t database -d postgresql -D "Test worker" -p . -n

if [ -d "library-test" ]; then
    echo "Error: library-test directory exists" >&2
    exit 1
fi

if [ -d "service-test" ]; then
    echo "Error: service-test directory exists" >&2
    exit 1
fi

if [ -d "worker-test" ]; then
    echo "Error: worker-test directory exists" >&2
    exit 1
fi


RUST_BACKTRACE=1 cargo run --release init service service-test -d postgresql -D "Test service" -p . -n

cd service-test

RUST_BACKTRACE=1 cargo run --release init router router-test -n

if [ -d "router-test" ]; then
    echo "Error: router-test directory exists" >&2
    exit 1
fi
