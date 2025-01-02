mkdir -p output/init-application
cd output/init-application

RUST_BACKTRACE=1 cargo run login

databases=("postgresql" "mongodb")
validators=("zod" "typebox")
frameworks=("express" "hyper-express")
runtimes=("bun" "node")
test_frameworks=("vitest" "jest")

for database in "${databases[@]}"; do
  for validator in "${validators[@]}"; do
    for framework in "${frameworks[@]}"; do
        for runtime in "${runtimes[@]}"; do
        if [ "$framework" = "hyper-express" ] && [ "$runtime" = "bun" ]; then
            continue
        fi
        for test_framework in "${test_frameworks[@]}"; do
            app_name="application-${validator}-${framework}-${runtime}-${test_framework}"

            RUST_BACKTRACE=1 cargo run init application "$app_name" \
                -d "$database" \
                -v "$validator" \
                -f "$framework" \
                -r "$runtime" \
                -t "$test_framework" \
                -s "billing" \
                -s "iam" \
                -D "Test application" \
                -A "Rohin Bhargava" \
                -L "apgl" 

        done
        done
    done
  done
done
