echo "Processing applications..."
if [ -d "output/init-application" ]; then
    rm -rf output/init-application
fi

mkdir -p output/init-application
cd output/init-application

CACHE_FILE="processed_apps.cache"
touch "$CACHE_FILE"

RUST_BACKTRACE=1 cargo run login

databases=("postgresql" "mongodb")
validators=("zod" "typebox")
frameworks=("express" "hyper-express")
runtimes=("bun" "node")
test_frameworks=("vitest" "jest")
licenses=("apgl" "gpl" "lgpl" "mozilla" "apache" "mit" "boost" "unlicense" "none")

for database in "${databases[@]}"; do
  for validator in "${validators[@]}"; do
    for framework in "${frameworks[@]}"; do
      for runtime in "${runtimes[@]}"; do
        if [ "$framework" = "hyper-express" ] && [ "$runtime" = "bun" ]; then
          continue
        fi
        for test_framework in "${test_frameworks[@]}"; do
          for license in "${licenses[@]}"; do
            cache_name="application-${database}-${validator}-${framework}-${runtime}"
            app_name="${cache_name}-${test_framework}-${license}"

            RUST_BACKTRACE=1 cargo run init application "$app_name" \
                -d "$database" \
                -v "$validator" \
                -F "$framework" \
                -r "$runtime" \
                -t "$test_framework" \
                -s "billing" \
                -s "iam" \
                -D "Test application" \
                -A "Rohin Bhargava" \
                -L "$license" 

            if grep -Fxq "$cache_name" "$CACHE_FILE"; then
                continue
            fi
            cd "$app_name"
            if [ "$runtime" = "bun" ]; then
              bun install
            else
              pnpm install
            fi

            if [ "$runtime" = "bun" ]; then
              bun run build
            else
              pnpm build
            fi

            cd ..

            echo "$cache_name" >> "$CACHE_FILE"
          done
        done
      done
    done
  done
done
