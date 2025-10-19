if [ -d "output/sync-application-add" ]; then
    rm -rf output/sync-application-add
fi

mkdir -p output/sync-application-add
cd output/sync-application-add

RUST_BACKTRACE=1 cargo run --release init application sync-test-node-application -p ./sync-test-node-application -o src/modules -d postgresql -m billing-base -m iam-base -f prettier -l eslint -v zod -F express -r node -t vitest -D "Test Sync Application" -A "Mushroom Research" -L 'AGPL-3.0'

# Init dummy application
RUST_BACKTRACE=1 cargo run --release init application sync-test-node-application -p ./sync-test-dummy-application -o src/modules -d postgresql -m billing-base -m iam-base -f prettier -l eslint -v zod -F express -r node -t vitest -D "Test Sync Application Dummy" -A "Mushroom Research" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-dummy -p ./sync-test-dummy-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release init service svc-dummy -d postgresql -p ./sync-test-dummy-application/src/modules -D "Test service"
RUST_BACKTRACE=1 cargo run --release init worker wrk-dummy -t database -d postgresql -p ./sync-test-dummy-application/src/modules -D "Test worker"
RUST_BACKTRACE=1 cargo run --release init router rtr-dummy -p ./sync-test-dummy-application/src/modules/billing
RUST_BACKTRACE=1 cargo run --release init router rtr-dummy-two -p ./sync-test-dummy-application/src/modules/iam

# Define copy operations with proper key-value syntax
declare -A copy_operations=(
    ["sync-test-dummy-application/src/modules/lib-dummy"]="sync-test-node-application/src/modules/"
    ["sync-test-dummy-application/src/modules/svc-dummy"]="sync-test-node-application/src/modules/"
    ["sync-test-dummy-application/src/modules/wrk-dummy"]="sync-test-node-application/src/modules/"
    ["sync-test-dummy-application/src/modules/billing/services"]="sync-test-node-application/src/modules/billing/"
    ["sync-test-dummy-application/src/modules/billing/server.ts"]="sync-test-node-application/src/modules/billing/"
    ["sync-test-dummy-application/src/modules/billing/sdk.ts"]="sync-test-node-application/src/modules/billing/"
    ["sync-test-dummy-application/src/modules/billing/registrations.ts"]="sync-test-node-application/src/modules/billing/"
    ["sync-test-dummy-application/src/modules/billing/persistence/entities/index.ts"]="sync-test-node-application/src/modules/billing/persistence/entities/"
    ["sync-test-dummy-application/src/modules/billing/persistence/seeders/index.ts"]="sync-test-node-application/src/modules/billing/persistence/seeders/"
    ["sync-test-dummy-application/src/modules/billing/persistence/seed-data.ts"]="sync-test-node-application/src/modules/billing/persistence/"
    ["sync-test-dummy-application/src/modules/billing/api/controllers/index.ts"]="sync-test-node-application/src/modules/billing/api/controllers/"
    ["sync-test-dummy-application/src/modules/iam/services"]="sync-test-node-application/src/modules/iam/"
    ["sync-test-dummy-application/src/modules/iam/server.ts"]="sync-test-node-application/src/modules/iam/"
    ["sync-test-dummy-application/src/modules/iam/sdk.ts"]="sync-test-node-application/src/modules/iam/"
    ["sync-test-dummy-application/src/modules/iam/registrations.ts"]="sync-test-node-application/src/modules/iam/"
    ["sync-test-dummy-application/src/modules/iam/persistence/entities/index.ts"]="sync-test-node-application/src/modules/iam/persistence/entities/"
    ["sync-test-dummy-application/src/modules/iam/persistence/seeders/index.ts"]="sync-test-node-application/src/modules/iam/persistence/seeders/"
    ["sync-test-dummy-application/src/modules/iam/persistence/seed-data.ts"]="sync-test-node-application/src/modules/iam/persistence/"
    ["sync-test-dummy-application/src/modules/iam/api/controllers/index.ts"]="sync-test-node-application/src/modules/iam/api/controllers/"
)

# Function to copy with error handling and directory creation
copy_with_check() {
    local source="$1"
    local destination="$2"
    
    # Check if source exists
    if [ ! -e "$source" ]; then
        echo "ERROR: Source '$source' does not exist"
        return 1
    fi
    
    # Create destination directory if it doesn't exist
    if [ ! -d "$destination" ]; then
        echo "Creating directory: $destination"
        mkdir -p "$destination"
    fi
    
    echo "Copying $source to $destination"
    if cp -rp "$source" "$destination"; then
        echo "SUCCESS: Copied $source"
    else
        echo "ERROR: Failed to copy $source"
        return 1
    fi
}

# Execute all copy operations
for source_path in "${!copy_operations[@]}"; do
    destination_path="${copy_operations[$source_path]}"
    copy_with_check "$source_path" "$destination_path"
done

RUST_BACKTRACE=1 cargo run --release sync all -p ./sync-test-node-application -c -P '{"svc-dummy": {"category": "service", "database": "none", "infrastructure": "none", "description": "none"}, "lib-dummy": {"category": "library", "description": "lib dummy"}, "rtr-dummy": {"category": "router", "infrastructure": "none"}, "wrk-dummy": {"category": "worker", "type": "database", "database": "postgresql", "description": "worker dummy"}}'

cd sync-test-node-application/src/modules

pnpm install
pnpm build

cd ../../..

RUST_BACKTRACE=1 cargo run --release init application sync-test-bun-application -p ./sync-test-bun-application -o src/modules -d postgresql -f biome -l oxlint -v zod -F express -r bun -t vitest -m billing-base -m iam-base -D "Test Sync Application" -A "Mushroom Research" -L 'AGPL-3.0'

# Init dummy application
RUST_BACKTRACE=1 cargo run --release init application sync-test-bun-application -p ./sync-test-bun-dummy-application -o src/modules -d postgresql -m billing-base -m iam-base -f prettier -l eslint -v zod -F express -r node -t vitest -D "Test Sync Application Dummy" -A "Mushroom Research" -L 'AGPL-3.0'
RUST_BACKTRACE=1 cargo run --release init library lib-dummy -p ./sync-test-bun-dummy-application -D "Test library"
RUST_BACKTRACE=1 cargo run --release init service svc-dummy -d postgresql -p ./sync-test-bun-dummy-application/src/modules -D "Test service"
RUST_BACKTRACE=1 cargo run --release init worker wrk-dummy -t database -d postgresql -p ./sync-test-bun-dummy-application/src/modules -D "Test worker"
RUST_BACKTRACE=1 cargo run --release init router rtr-dummy -p ./sync-test-bun-dummy-application/src/modules/billing
RUST_BACKTRACE=1 cargo run --release init router rtr-dummy-two -p ./sync-test-bun-dummy-application/src/modules/iam



declare -A copy_operations_dummy=(
    ["sync-test-bun-dummy-application/src/modules/lib-dummy"]="sync-test-bun-application/src/modules/"
    ["sync-test-bun-dummy-application/src/modules/svc-dummy"]="sync-test-bun-application/src/modules/"
    ["sync-test-bun-dummy-application/src/modules/wrk-dummy"]="sync-test-bun-application/src/modules/"
    ["sync-test-bun-dummy-application/src/modules/billing/services"]="sync-test-bun-application/src/modules/billing/"
    ["sync-test-bun-dummy-application/src/modules/billing/server.ts"]="sync-test-bun-application/src/modules/billing/"
    ["sync-test-bun-dummy-application/src/modules/billing/sdk.ts"]="sync-test-bun-application/src/modules/billing/"
    ["sync-test-bun-dummy-application/src/modules/billing/registrations.ts"]="sync-test-bun-application/src/modules/billing/"
    ["sync-test-bun-dummy-application/src/modules/billing/persistence/entities/index.ts"]="sync-test-bun-application/src/modules/billing/persistence/entities/"
    ["sync-test-bun-dummy-application/src/modules/billing/persistence/seeders/index.ts"]="sync-test-bun-application/src/modules/billing/persistence/seeders/"
    ["sync-test-bun-dummy-application/src/modules/billing/persistence/seed-data.ts"]="sync-test-bun-application/src/modules/billing/persistence/"
    ["sync-test-bun-dummy-application/src/modules/billing/api/controllers/index.ts"]="sync-test-bun-application/src/modules/billing/api/controllers/"
    ["sync-test-bun-dummy-application/src/modules/iam/services"]="sync-test-bun-application/src/modules/iam/"
    ["sync-test-bun-dummy-application/src/modules/iam/server.ts"]="sync-test-bun-application/src/modules/iam/"
    ["sync-test-bun-dummy-application/src/modules/iam/sdk.ts"]="sync-test-bun-application/src/modules/iam/"
    ["sync-test-bun-dummy-application/src/modules/iam/registrations.ts"]="sync-test-bun-application/src/modules/iam/"
    ["sync-test-bun-dummy-application/src/modules/iam/persistence/entities/index.ts"]="sync-test-bun-application/src/modules/iam/persistence/entities/"
    ["sync-test-bun-dummy-application/src/modules/iam/persistence/seeders/index.ts"]="sync-test-bun-application/src/modules/iam/persistence/seeders/"
    ["sync-test-bun-dummy-application/src/modules/iam/persistence/seed-data.ts"]="sync-test-bun-application/src/modules/iam/persistence/"
    ["sync-test-bun-dummy-application/src/modules/iam/api/controllers/index.ts"]="sync-test-bun-application/src/modules/iam/api/controllers/"
)

for source_path in "${!copy_operations_dummy[@]}"; do
    destination_path="${copy_operations_dummy[$source_path]}"
    copy_with_check "$source_path" "$destination_path"
done

cd sync-test-bun-application/src/modules

RUST_BACKTRACE=1 cargo run --release sync all -p ./sync-test-bun-application -c -P '{"svc-dummy": {"category": "service", "database": "none", "infrastructure": "none", "description": "none"}, "lib-dummy": {"category": "library", "description": "lib dummy"}, "rtr-dummy": {"category": "router", "infrastructure": "none"}, "wrk-dummy": {"category": "worker", "type": "database", "database": "postgresql", "description": "worker dummy"}}'

bun install
bun run build

cd ../../..