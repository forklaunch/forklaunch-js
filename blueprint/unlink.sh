# Define arrays of directories and packages
DIRS=("core" "billing" "iam" "monitoring" "sample-worker")
PACKAGES=("common" "validator" "core" "express" "hyper-express" "universal-sdk")

# Loop through each directory
for dir in "${DIRS[@]}"; do
  cd $dir

  # Loop through each package and create symlink
  for package in "${PACKAGES[@]}"; do
    pnpm unlink ../../framework/$package
  done

  cd ..
done

cd interfaces

./unlink.sh

cd ../implementations

./unlink.sh