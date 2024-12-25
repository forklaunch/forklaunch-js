mkdir -p output/application
cd output/application

RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-vitest-billing-iam -d postgresql -v zod -f express -r bun -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-vitest -d postgresql -v zod -f express -r bun -t vitest
RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-jest-billing-iam -d postgresql -v zod -f express -r bun -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-jest -d postgresql -v zod -f express -r bun -t jest
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-vitest-billing-iam -d postgresql -v typebox -f express -r bun -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-vitest -d postgresql -v typebox -f express -r bun -t vitest
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-jest-billing-iam -d postgresql -v typebox -f express -r bun -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-jest -d postgresql -v typebox -f express -r bun -t jest
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest-billing-iam -d postgresql -v zod -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest -d postgresql -v zod -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest-billing-iam -d postgresql -v zod -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest -d postgresql -v zod -f hyper-express -r node -t jest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest-billing-iam -d postgresql -v typebox -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest -d postgresql -v typebox -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest-billing-iam -d postgresql -v typebox -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest -d postgresql -v typebox -f hyper-express -r node -t jest

RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest-billing-iam -d postgresql -v zod -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest -d postgresql -v zod -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest-billing-iam -d postgresql -v zod -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest -d postgresql -v zod -f hyper-express -r node -t jest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest-billing-iam -d postgresql -v typebox -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest -d postgresql -v typebox -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest-billing-iam -d postgresql -v typebox -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest -d postgresql -v typebox -f hyper-express -r node -t jest
