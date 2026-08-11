//! # serde-envfile
//! Built ontop the [`dotenvy`](https://github.com/allan2/dotenvy) and
//! [`envy`](https://github.com/softprops/envy) crates, `serde-envfile`
//! supports both the serialization and the deserialization of environment
//! variables from or to files (`from_file`, `to_file`), strings
//! (`from_str`, `to_string`), or the environment of the application
//! (`from_env`).
//!
//! ## Examples
//! Note that keys are transformed to lowercase during deserialization.
//! With serialization, the contrary is the case.
//! ```no_run
//! use serde::{Deserialize, Serialize};
//! use serde_envfile::{Error, from_str, to_string};
//!
//! #[derive(Debug, Deserialize, Serialize)]
//! struct Test {
//!     hello: String,
//! }
//!
//! fn main() -> Result<(), Error> {
//!     let env = "HELLO=\"WORLD\"";
//!     let test: Test = from_str(env)?;
//!     let env = to_string(&test)?;
//!
//!     println!("{}", env);
//!
//!     Ok(())
//! }
//! ```
//!
//! Introducing the `Value` type, `serde-envfile`, also provides a more flexible approach to working with environment variables.
//! ```no_run
//! use serde_envfile::{to_string, Error, Value};
//!
//! fn main() -> Result<(), Error> {
//!    let mut env = Value::new();
//!    env.insert("hello".into(), "world".into());
//!    let env = to_string(&env)?;
//!
//!    println!("{}", env);
//!
//!    Ok(())
//! }
//! ```

#[doc(hidden)]
pub mod de;
pub(crate) mod error;
pub(crate) mod prefixed;
pub(crate) mod ser;
pub(crate) mod value;

pub use de::{from_env, from_file, from_reader, from_str};
pub use error::Error;
pub use prefixed::{Prefixed, prefixed};
pub use ser::{Serializer, to_file, to_string, to_writer};
pub use value::Value;

#[cfg(test)]
mod tests {
    use crate::{Value, from_str, to_string};
    use serde::{Deserialize, Serialize};

    #[test]
    fn basic_main() {
        #[derive(Debug, Deserialize, Serialize)]
        struct Test {
            hello: String,
        }

        let de = "HELLO=\"WORLD\"";
        let test: Test = from_str(de).unwrap();
        let ser = to_string(&test).unwrap();

        assert_eq!(de, ser)
    }

    #[test]
    fn value_main() {
        let mut env = Value::new();
        env.insert("hello".into(), "world".into());
        let ser = to_string(&env).unwrap();

        let de: Value = from_str(&ser).unwrap();

        assert_eq!(env, de);
    }
}
