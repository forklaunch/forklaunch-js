# serde-envfile

Built ontop the [`dotenvy`](https://github.com/allan2/dotenvy) and [`envy`](https://github.com/softprops/envy) crates, `serde-envfile` supports both the serialization and the deserialization of environment variables from or to files (`from_file`, `to_file`), strings (`from_str`, `to_string`), or the environment of the application (`from_env`).

## Install

Extend your `Cargo.toml` configuration file to include `serde-envfile` as a dependency or install the package with the Cargo package manager.

```zsh
cargo add serde-envfile
```

## Example

```Rust
use serde::{Deserialize, Serialize};
use serde_envfile::{Error, from_str, to_string};

#[derive(Debug, Deserialize, Serialize)]
struct Test {
    hello: String,
}

fn main() -> Result<(), Error> {
    let env = "HELLO=\"WORLD\"";
    let test: Test = from_str(env)?;
    let env = to_string(&test)?;

    println!("{}", env);

    Ok(())
}
```

Introducing the `Value` type, `serde-envfile`, provides a more flexible approach to working with environment variables.

```Rust
use serde_envfile::{to_string, Error, Value};

fn main() -> Result<(), Error> {
    let mut env = Value::new();
    env.insert("hello".into(), "world".into());
    let env = to_string(&env)?;

    println!("{}", env);

    Ok(())
}
```