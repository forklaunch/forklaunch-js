echo "Testing environment validate command..."

if [ -d "output/environment-validate" ]; then
    rm -rf output/environment-validate
fi

mkdir -p output/environment-validate
cd output/environment-validate

echo "Creating test application..."
RUST_BACKTRACE=1 cargo run --release init application env-test-app \
    -p env-test-app \
    -o src/modules \
    -d postgresql \
    -f prettier \
    -l eslint \
    -v zod \
    -F express \
    -r node \
    -t vitest \
    -m billing-base \
    -m iam-base \
    -D "Test application for environment validation" \
    -A "Test Author" \
    -L "MIT"

echo "Adding custom service..."
RUST_BACKTRACE=1 cargo run --release init service custom-svc \
    -d postgresql \
    -p env-test-app/src/modules \
    -D "Custom service for env testing"

cd env-test-app

echo "Testing environment validate (expecting missing variables)..."
RUST_BACKTRACE=1 cargo run --release environment validate

# Create some .env files with partial variables
echo "Creating partial .env files..."
mkdir -p src/modules/billing
echo "HOST=localhost" > src/modules/billing/.env.local
echo "PORT=3001" >> src/modules/billing/.env.local

mkdir -p src/modules/iam
echo "HOST=localhost" > src/modules/iam/.env.local
echo "HMAC_SECRET_KEY=test-secret" >> src/modules/iam/.env.local

echo "Testing environment validate after adding some variables..."
RUST_BACKTRACE=1 cargo run --release environment validate

echo "Environment validate test completed!"
