if [ -d "output/sync-application-add" ]; then
    rm -rf output/sync-application-add
fi

mkdir -p output/sync-application-add
cd output/sync-application-add

RUST_BACKTRACE=1 cargo run --release init application sync-test-node-application -p ./sync-test-node-application -o src/modules -d postgresql -m billing-base -m iam-base -f prettier -l eslint -v zod -F express -r node -t vitest -D "Test Sync Application" -A "Mushroom Research" -L 'AGPL-3.0'


RUST_BACKTRACE=1 cargo run --release init application sync-test-dummy-application -p ./sync-test-dummy-application -o src/modules -d postgresql -m billing-base -m iam-base -f prettier -l eslint -v zod -F express -r node -t vitest -D "Test Sync Application Dummy" -A "Mushroom Research" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-dummy -p ./sync-test-dummy-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release init service svc-dummy -d postgresql -p ./sync-test-dummy-application/src/modules -D "Test service"
RUST_BACKTRACE=1 cargo run --release init worker wrk-dummy -t database -d postgresql -p ./sync-test-dummy-application/src/modules -D "Test worker"
RUST_BACKTRACE=1 cargo run --release init router rtr-dummy -p ./sync-test-dummy-application/src/modules/billing
RUST_BACKTRACE=1 cargo run --release init router rtr-dummy-two -p ./sync-test-dummy-application/src/modules/iam

cp -rp sync-test-dummy-application/src/modules/lib-dummy sync-test-node-application/src/modules/
cp -rp sync-test-dummy-application/src/modules/svc-dummy sync-test-node-application/src/modules/
cp -rp sync-test-dummy-application/src/modules/wrk-dummy sync-test-node-application/src/modules/
cp -rp sync-test-dummy-application/src/modules/rtr-dummy sync-test-node-application/src/modules/
cp -rp sync-test-dummy-application/src/modules/rtr-dummy-two sync-test-node-application/src/modules/

RUST_BACKTRACE=1 cargo run --release sync -p .