if [ -d "output/init-billing-stripe" ]; then
    rm -rf output/init-billing-stripe
fi

mkdir -p output/init-billing-stripe
cd output/init-billing-stripe

RUST_BACKTRACE=1 cargo run --release init application billing-stripe-node -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m billing-stripe -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd billing-stripe-node

pnpm install
pnpm build
pnpm database:setup

docker compose -p billing-stripe-node down

cd ..

RUST_BACKTRACE=1 cargo run --release init application billing-stripe-bun -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-stripe -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd billing-stripe-bun

bun install
bun run build
bun database:setup

docker compose -p billing-stripe-bun down