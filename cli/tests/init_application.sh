mkdir -p output/application
cd output/application

RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-vitest-billing-iam -v zod -f express -r bun -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-vitest -v zod -f express -r bun -t vitest
RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-jest-billing-iam -v zod -f express -r bun -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-express-bun-jest -v zod -f express -r bun -t jest
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-vitest-billing-iam -v typebox -f express -r bun -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-vitest -v typebox -f express -r bun -t vitest
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-jest-billing-iam -v typebox -f express -r bun -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-express-bun-jest -v typebox -f express -r bun -t jest
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest-billing-iam -v zod -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest -v zod -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest-billing-iam -v zod -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest -v zod -f hyper-express -r node -t jest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest-billing-iam -v typebox -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest -v typebox -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest-billing-iam -v typebox -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest -v typebox -f hyper-express -r node -t jest

RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest-billing-iam -v zod -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-vitest -v zod -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest-billing-iam -v zod -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-zod-hyper-express-node-jest -v zod -f hyper-express -r node -t jest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest-billing-iam -v typebox -f hyper-express -r node -t vitest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-vitest -v typebox -f hyper-express -r node -t vitest
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest-billing-iam -v typebox -f hyper-express -r node -t jest -p billing -p iam
RUST_BACKTRACE=1 cargo run init application application-typebox-hyper-express-node-jest -v typebox -f hyper-express -r node -t jest

# cd newapp
# RUST_BACKTRACE=1 cargo run init library newlibrary
# RUST_BACKTRACE=1 cargo run init service newservice
