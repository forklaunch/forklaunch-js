echo "Testing custom path subset of application initialization..."

# Clean up any existing test directories
rm -rf test-app-current test-app-custom custom-test-path output/init-application

# Create output directory
mkdir -p output/init-application
cd output/init-application

echo "Testing current directory scenario..."
# Test current directory scenario - use current directory
RUST_BACKTRACE=1 cargo run --release init application "test-app-current" \
    --path "." \
    -o "source" \
    -d "postgresql" \
    -v "zod" \
    -f "prettier" \
    -l "eslint" \
    -F "express" \
    -r "node" \
    -t "vitest" \
    -m "billing-base" \
    -m "iam-base" \
    -D "Test application" \
    -A "Test User" \
    -L "MIT"

echo "Testing custom path scenario..."
# Test custom path scenario - use custom path
mkdir -p custom-test-path

RUST_BACKTRACE=1 cargo run --release init application "test-app-custom" \
    --path "./custom-test-path" \
    -o "modules" \
    -d "postgresql" \
    -v "zod" \
    -f "prettier" \
    -l "eslint" \
    -F "express" \
    -r "node" \
    -t "vitest" \
    -m "billing-base" \
    -m "iam-base" \
    -D "Test application" \
    -A "Test User" \
    -L "MIT"

echo "Small test completed!"
echo ""
echo "Checking created directories:"
ls -la
echo ""
echo "Checking custom path:"
ls -la custom-test-path/ 2>/dev/null || echo "Custom path not found"
echo ""
echo "Checking current directory app:"
ls -la test-app-current/ 2>/dev/null || echo "Current directory app not found"
echo ""
echo "Checking custom path app:"
ls -la custom-test-path/test-app-custom/ 2>/dev/null || echo "Custom path app not found"