if [ -d "output/init-iam-better-auth" ]; then
    rm -rf output/init-iam-better-auth
fi

mkdir -p output/init-iam-better-auth
cd output/init-iam-better-auth

RUST_BACKTRACE=1 cargo run --release init application iam-better-auth-node -p iam-better-auth-node -o src/modules -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -m iam-better-auth -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd iam-better-auth-node/src/modules

pnpm install
pnpm build
pnpm database:setup

docker compose -p iam-better-auth-node down

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application iam-better-auth-bun -p iam-better-auth-bun -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m iam-better-auth -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd iam-better-auth-bun/src/modules

bun install --trusted
bun pm trust
bun run build
bun database:setup

docker compose -p iam-better-auth-bun down