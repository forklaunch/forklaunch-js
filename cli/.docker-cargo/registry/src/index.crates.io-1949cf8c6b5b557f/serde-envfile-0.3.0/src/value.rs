cfg_if::cfg_if! {
    if #[cfg(feature = "preserve_order")] {
        use indexmap::IndexMap as Map;
    } else {
        // std::collections::HashMap vs hashbrown::HashMap
        // https://users.rust-lang.org/t/hashmap-and-hashbrown/114535/2
        use std::collections::HashMap as Map;
    }
}

/// Flexible representation of environment variables.
///
/// # Example
///
/// ```
/// use serde_envfile::{Value, Error, from_str};
///
/// fn flexible_example() -> Result<(), Error> {
///     let envfile = "HELLO=WORLD";
///
///     let value: Value = from_str(envfile)?;
///     println!("{:?}", value);
///     
///     Ok(())
/// }
/// ```
#[derive(Debug, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(transparent)]
pub struct Value(Map<String, String>);

impl Default for Value {
    fn default() -> Self {
        Self::new()
    }
}

impl Value {
    /// Create an empty [`Value`].
    ///
    /// Internally, the [`Value`] object uses a map to store the key-value pairs.
    pub fn new() -> Self {
        Self(Default::default())
    }
}

impl std::ops::Deref for Value {
    type Target = Map<String, String>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl std::ops::DerefMut for Value {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl<K, V> FromIterator<(K, V)> for Value
where
    K: Into<String>,
    V: Into<String>,
{
    /// Create a new [`Value`] from an iterator of key-value pairs.
    ///
    /// # Example
    ///
    /// ```rust
    /// use serde_envfile::Value;
    ///
    /// let env = Value::from_iter([("KEY1", "VALUE1"), ("KEY2", "VALUE2")]);
    /// # assert_eq!(env.get("KEY1").unwrap(), "VALUE1");
    /// # assert_eq!(env.get("KEY2").unwrap(), "VALUE2");
    /// ```
    ///
    fn from_iter<T: IntoIterator<Item = (K, V)>>(iter: T) -> Self {
        let iter = iter.into_iter().map(|(k, v)| (k.into(), v.into()));
        Self(FromIterator::from_iter(iter))
    }
}

#[cfg(test)]
mod tests {
    use super::Value;
    use crate::{de::from_str, ser::to_string};

    #[test]
    fn value_to_string() {
        //* Given
        let env = Value::from_iter([("KEY1", "VALUE1"), ("KEY2", "VALUE2")]);

        //* When
        let value_serialized = to_string(&env).expect("Failed to convert Value to String");
        let value_deserialized =
            from_str::<Value>(&value_serialized).expect("Failed to deserialize Value");

        //* Then
        // Assert that both expected lines are present
        // The order of keys in the serialized output is not guaranteed without the `preserve_order` feature
        assert!(value_serialized.contains(r#"KEY1="VALUE1""#));
        assert!(value_serialized.contains(r#"KEY2="VALUE2""#));

        // Assert the deserialize output follows the order of the original input
        // when the `preserve_order` feature is enabled
        #[cfg(feature = "preserve_order")]
        {
            let expected_serialized = "KEY1=\"VALUE1\"\nKEY2=\"VALUE2\"";
            assert_eq!(value_serialized, expected_serialized);
        }

        // Create a new Value with lowercase keys to match the deserialization behavior
        let expected_deserialized = Value::from_iter([("key1", "VALUE1"), ("key2", "VALUE2")]);
        assert_eq!(value_deserialized, expected_deserialized);
    }
}
