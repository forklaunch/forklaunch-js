if [ -d "output/init-application" ]; then
    rm -rf output/init-application
fi

mkdir -p output/init-application
cd output/init-application

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
            for license in "${licenses[@]}"; do
              if [ "$framework" = "hyper-express" ] && [ "$runtime" = "bun" ]; then
                  continue
              fi
              for test_framework in "${test_frameworks[@]}"; do
                  app_name="application-${database}-${validator}-${framework}-${runtime}-${test_framework}"

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
                      -L "$license" 

              done
            done
        done
    done
  done
done
