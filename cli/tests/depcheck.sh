mkdir -p output/depcheck
cd output/depcheck

RUST_BACKTRACE=1 cargo run init application depcheck-test-node-application -d postgresql -v zod -f express -r node -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L 'apgl'

cd output/depcheck/depcheck-test-node-application

RUST_BACKTRACE=1 cargo run init application depcheck-test-bun-application -d postgresql -v zod -f express -r bun -t vitest -s billing -s iam -D "Test service" -A "Rohin Bhargava" -L "mit"
