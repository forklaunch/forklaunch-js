RUST_BACKTRACE=1 cargo run init application newapp -v zod -f express -r node -t jest
cd newapp
RUST_BACKTRACE=1 cargo run init library newlibrary
RUST_BACKTRACE=1 cargo run init service newservice
