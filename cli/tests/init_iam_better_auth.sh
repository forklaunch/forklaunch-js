if [ -d "output/init-iam-better-auth" ]; then
    rm -rf output/init-iam-better-auth
fi

mkdir -p output/init-iam-better-auth
cd output/init-iam-better-auth

RUST_BACKTRACE=1 cargo run --release init application iam-better-auth-node -d postgresql -f prettier -l eslint -v zod -F express -r node -t vitest -s iam-better-auth -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd iam-better-auth-node

pnpm install
pnpm build
pnpm database:setup

docker compose -p iam-better-auth-node down

cd ..

RUST_BACKTRACE=1 cargo run --release init application iam-better-auth-bun -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -s iam-better-auth -D "Test library" -A "Rohin Bhargava" -L 'AGPL-3.0'

cd iam-better-auth-bun

bun install
bun run build
bun database:setup

docker compose -p iam-better-auth-bun down