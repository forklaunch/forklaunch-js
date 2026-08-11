use std::path::Path;

use super::{
    de::{from_env_inner, from_file_inner, from_reader_inner, from_str_inner},
    error::Result,
    ser::{to_file_inner, to_string_inner, to_writer_inner},
};

/// Instantiates [`Prefixed`] from which values can be both serialized and deserialized with a prefix.
///
/// The prefix is added to all keys during serialization and is expected to be present during deserialization.
/// This is useful for namespacing environment variables to avoid conflicts.
///
/// # Examples
///
/// ## Serializing with a prefix
///
/// ```
/// use serde::{Serialize};
/// use serde_envfile::{prefixed, Error};
///
/// #[derive(Serialize)]
/// struct Config {
///     database_url: String,
///     port: u16,
/// }
///
/// fn main() -> Result<(), Error> {
///     let config = Config {
///         database_url: "postgres://localhost/mydb".to_string(),
///         port: 8080,
///     };
///
///     // Serialize with "APP_" prefix
///     let env_string = prefixed("APP_").to_string(&config)?;
///     // Results in: APP_DATABASE_URL="postgres://localhost/mydb"\nAPP_PORT="8080"
///
///     println!("{}", env_string);
///     Ok(())
/// }
/// ```
///
/// ## Deserializing with a prefix
///
/// ```
/// use serde::{Deserialize};
/// use serde_envfile::{prefixed, Error};
///
/// #[derive(Deserialize, Debug)]
/// struct Config {
///     database_url: String,
///     port: u16,
/// }
///
/// fn main() -> Result<(), Error> {
///     let env_string = "APP_DATABASE_URL=\"postgres://localhost/mydb\"\nAPP_PORT=\"8080\"";
///
///     // Deserialize with "APP_" prefix
///     let config: Config = prefixed("APP_").from_str(env_string)?;
///
///     assert_eq!(config.database_url, "postgres://localhost/mydb");
///     assert_eq!(config.port, 8080);
///     
///     Ok(())
/// }
/// ```
pub fn prefixed(prefix: &str) -> Prefixed {
    Prefixed(prefix)
}

/// Helper structure to work with prefixed environment variables more efficiently.
///
/// This struct provides methods for serializing and deserializing data with a consistent prefix.
/// Use the [`prefixed`] function to create an instance of this struct.
pub struct Prefixed<'a>(&'a str);

impl<'a> Prefixed<'a> {
    pub fn from_env<T>(&self) -> Result<T>
    where
        T: serde::de::DeserializeOwned,
    {
        from_env_inner::<T>(Some(self.0))
    }

    pub fn from_str<T>(&self, input: &'a str) -> Result<T>
    where
        T: serde::de::DeserializeOwned,
    {
        from_str_inner::<T>(Some(self.0), input)
    }

    pub fn from_reader<R, T>(&self, reader: R) -> Result<T>
    where
        R: std::io::Read,
        T: serde::de::DeserializeOwned,
    {
        from_reader_inner::<R, T>(Some(self.0), reader)
    }

    pub fn from_file<T>(&self, path: &Path) -> Result<T>
    where
        T: serde::de::DeserializeOwned,
    {
        from_file_inner::<T>(Some(self.0), path)
    }

    pub fn to_string<T>(&self, v: &T) -> Result<String>
    where
        T: serde::ser::Serialize,
    {
        to_string_inner(Some(self.0), v)
    }

    pub fn to_writer<W, T>(&self, writer: W, v: &T) -> Result<()>
    where
        W: std::io::Write,
        T: serde::ser::Serialize,
    {
        to_writer_inner(Some(self.0), writer, v)
    }

    pub fn to_file<P, T>(&self, path: P, v: &T) -> Result<()>
    where
        P: AsRef<Path>,
        T: serde::ser::Serialize,
    {
        to_file_inner(Some(self.0), path, v)
    }
}

#[cfg(test)]
mod tests {
    use std::io::Cursor;

    use super::prefixed;
    use crate::Value;

    #[test]
    fn serialize_to_string_with_prefix() {
        //* Given
        let value = Value::from_iter([("hello", "world")]);

        //* When
        let output = prefixed("serde_envfile_")
            .to_string(&value)
            .expect("Failed to serialize");

        //* Then
        let expected_output = "SERDE_ENVFILE_HELLO=\"world\"";
        assert_eq!(output, expected_output);
    }

    #[test]
    fn deserilize_from_str_with_prefix() {
        //* Given
        #[derive(Debug, PartialEq, serde::Deserialize)]
        struct Config {
            hello: String,
        }

        let env = "SERDE_ENVFILE_HELLO=\"world\"";

        //* When
        let output = prefixed("serde_envfile_")
            .from_str::<Config>(env)
            .expect("Failed to deserialize");

        //* Then
        let expected_output = Config {
            hello: String::from("world"),
        };
        assert_eq!(output, expected_output);
    }

    #[test]
    fn serialize_to_writer_with_prefix() {
        //* Given
        let value = Value::from_iter([("hello", "world")]);

        let mut buffer = Vec::new();

        //* When
        prefixed("serde_envfile_")
            .to_writer(&mut buffer, &value)
            .expect("Failed to serialize to writer");

        //* Then
        let expected_output = "SERDE_ENVFILE_HELLO=\"world\"";
        let output = String::from_utf8(buffer).expect("Invalid UTF-8 sequence");
        assert_eq!(output, expected_output);
    }

    #[test]
    fn deserialize_from_reader_with_prefix() {
        //* Given
        #[derive(Debug, PartialEq, serde::Deserialize)]
        struct Config {
            hello: String,
        }

        let env = "SERDE_ENVFILE_HELLO=\"world\"";

        let reader = Cursor::new(env);

        //* When
        let output = prefixed("serde_envfile_")
            .from_reader::<_, Config>(reader)
            .expect("Failed to deserialize from reader");

        //* Then
        let expected_output = Config {
            hello: String::from("world"),
        };
        assert_eq!(output, expected_output);
    }
}
