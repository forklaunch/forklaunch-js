if [ -d "output/dryrun" ]; then
    rm -rf output/dryrun
fi

mkdir -p output/dryrun
cd output/dryrun

RUST_BACKTRACE=1 cargo run init application dryrun-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl' -n

if [ "$(ls -A)" ]; then
     echo "Error: Directory not empty" >&2
     exit 1
fi

RUST_BACKTRACE=1 cargo run init application dryrun-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl'

cd dryrun-test-node-application

RUST_BACKTRACE=1 cargo run init library library-test -D "Test service" -p . -n
RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -D "Test service" -p . -n
RUST_BACKTRACE=1 cargo run init worker worker-test -b database -D "Test worker" -p . -n

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


RUST_BACKTRACE=1 cargo run init service service-test -d postgresql -D "Test service" -p .

cd service-test

RUST_BACKTRACE=1 cargo run init router router-test -n

if [ -d "router-test" ]; then
    echo "Error: router-test directory exists" >&2
    exit 1
fi
