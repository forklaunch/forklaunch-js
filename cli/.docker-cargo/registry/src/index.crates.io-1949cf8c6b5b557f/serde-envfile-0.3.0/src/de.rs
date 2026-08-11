use std::path::Path;

use super::error::{Error, Result};

pub fn from_iter<T, Iter>(iter: Iter) -> Result<T>
where
    T: serde::de::DeserializeOwned,
    Iter: IntoIterator<Item = (String, String)>,
{
    from_iter_inner::<T, Iter>(None, iter)
}

pub fn from_iter_inner<T, Iter>(prefix: Option<&str>, iter: Iter) -> Result<T>
where
    T: serde::de::DeserializeOwned,
    Iter: IntoIterator<Item = (String, String)>,
{
    match prefix {
        Some(pref) => envy::prefixed(pref.to_uppercase()).from_iter::<_, T>(iter),
        None => {
            // No prefix provided, use default behavior
            envy::from_iter::<_, T>(iter)
        }
    }
    .map_err(Error::new)
}

/// Deserialize program-available environment variables into an instance of type `T`.
///
/// # Example
///
/// ```
/// use serde::Deserialize;
/// use serde_envfile::{from_env, Error};
///
/// #[derive(Debug, Deserialize)]
/// struct Test {
///     #[cfg(windows)]
///     #[serde(rename="username")]
///     user: String,
///     #[cfg(not(windows))]
///     user: String,
/// }
///
/// let value = from_env::<Test>().expect("Failed to deserialize from environment");
/// 
/// println!("{:?}", value);
/// ```
pub fn from_env<T>() -> Result<T>
where
    T: serde::de::DeserializeOwned,
{
    from_env_inner(None)
}

pub fn from_env_inner<T>(prefix: Option<&str>) -> Result<T>
where
    T: serde::de::DeserializeOwned,
{
    match prefix {
        Some(pref) => envy::prefixed(pref.to_uppercase()).from_env::<T>(),
        None => envy::from_env::<T>(),
    }
    .map_err(Error::new)
}

/// Deserialize environment variables from a string into an instance of type `T`.
///
/// # Example
///
/// ```
/// use serde_envfile::{from_str, Value, Error};
///
/// let env = "HELLO=world";
/// let value = from_str::<Value>(env).expect("Failed to deserialize from string");
/// 
/// println!("{:?}", value);
/// ```
pub fn from_str<T>(input: &str) -> Result<T>
where
    T: serde::de::DeserializeOwned,
{
    from_str_inner::<T>(None, input)
}

pub fn from_str_inner<'a, T>(prefix: Option<&'a str>, input: &'a str) -> Result<T>
where
    T: serde::de::DeserializeOwned,
{
    let mut env = Vec::new();

    for pair in dotenvy::from_read_iter(input.as_bytes()) {
        let (key, value) = pair.map_err(Error::new)?;
        env.push((key, value));
    }

    from_iter_inner::<T, _>(prefix, env)
}

/// Deserialize environment variables from a reader into an instance of type `T`.
///
/// # Example
///
/// ```
/// use std::io::Cursor;
/// use serde_envfile::{from_reader, Value, Error};
///
/// let input = Cursor::new("HELLO=world");
/// let value = from_reader::<_, Value>(input).expect("Envfile deserialization failed");
///
/// println!("{:?}", value);
/// ```
pub fn from_reader<R, T>(reader: R) -> Result<T>
where
    R: std::io::Read,
    T: serde::de::DeserializeOwned,
{
    from_reader_inner(None, reader)
}

pub(crate) fn from_reader_inner<R, T>(prefix: Option<&str>, reader: R) -> Result<T>
where
    R: std::io::Read,
    T: serde::de::DeserializeOwned,
{
    let mut env = Vec::new();

    for pair in dotenvy::from_read_iter(reader) {
        let (key, value) = pair.map_err(Error::new)?;
        env.push((key, value));
    }

    from_iter_inner::<T, _>(prefix, env)
}

/// Deserialize an environment variable file into an instance of type `T`.
///
/// # Example
///
/// ```no_run
/// use std::path::PathBuf;
/// use serde_envfile::{Value, from_file};
///
/// let path = PathBuf::from(".env");
/// let value = from_file::<Value>(&path).expect("Failed to deserialize from file");
/// 
/// println!("{:?}", value);
/// ```
pub fn from_file<T>(path: &Path) -> Result<T>
where
    T: serde::de::DeserializeOwned,
{
    from_file_inner(None, path)
}

pub fn from_file_inner<T>(prefix: Option<&str>, path: &Path) -> Result<T>
where
    T: serde::de::DeserializeOwned,
{
    let mut env = Vec::new();

    for pair in dotenvy::from_filename_iter(path).map_err(Error::new)? {
        let (key, value) = pair.map_err(Error::new)?;
        env.push((key, value));
    }

    from_iter_inner::<T, _>(prefix, env)
}

#[cfg(test)]
mod tests {
    use std::{
        env::{set_var, vars},
        fs::write,
        io::{Cursor, Seek, SeekFrom},
    };

    use tempfile::NamedTempFile;

    use super::{from_env, from_file, from_reader, from_str};
    use crate::Value;

    #[test]
    fn from_env_test() {
        unsafe {
            set_var("SERDE_ENVFILE", "HELLO WORLD");
        }

        let env: Value = from_env().unwrap();

        assert_eq!(env.len(), vars().collect::<Vec<(String, String)>>().len());

        for (key, value) in vars() {
            assert_eq!(&value, env.get(&key.to_lowercase()).unwrap());
        }
    }

    #[test]
    fn from_str_test() {
        let input = "HELLO=world";
        let env: Value = from_str(input).unwrap();

        assert_eq!(env.len(), 1);
        assert_eq!("world", env.get("hello").unwrap());
    }

    #[test]
    fn deserialize_from_reader() {
        //* Given
        let input = "HELLO=world";

        let reader = Cursor::new(input);

        //* When
        let env: Value = from_reader(reader).expect("Failed to deserialize from reader");

        //* Then
        assert_eq!(env.len(), 1);
        assert_eq!("world", env.get("hello").unwrap());
    }

    #[test]
    fn from_file_test() {
        let input = "HELLO=world";
        let mut file = NamedTempFile::new().unwrap();
        write(file.path(), input).unwrap();
        file.seek(SeekFrom::Start(0)).unwrap();

        let env: Value = from_file(file.path()).expect("Failed to deserialize from file");

        assert_eq!(env.len(), 1);
        assert_eq!("world", env.get("hello").unwrap());
    }
}
