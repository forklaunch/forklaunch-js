use std::{fs::File, path::Path};

use serde::ser::Serialize as _;

use super::error::{Error, Result};

cfg_if::cfg_if! {
    if #[cfg(feature = "debug")] {
        use log::debug;
    } else {
        #[allow(unused_macros)]
        macro_rules! debug {
            ($fmt:expr $(, $arg:expr)*) => {};
        }
    }
}

/// A serializer to transform Rust data into environment variables.
pub struct Serializer {
    output: String,
    base_prefix: String,
    prefix: String,
    key: bool,
    sequence: bool,
    prefix_before: String,
}

impl Serializer {
    fn new(prefix: Option<&str>) -> Self {
        Self {
            output: String::new(),
            base_prefix: prefix.unwrap_or("").to_uppercase(),
            prefix: "".into(),
            key: false,
            sequence: false,
            prefix_before: "".into(),
        }
    }

    pub(crate) fn strip_line_breaks(&mut self) {
        while self.output.ends_with('\n') {
            self.output = self.output[..self.output.len() - 1].into();
        }
    }
}

/// Serialize data into an environment variable string.
///
/// # Example
///
/// ```
/// use serde_envfile::{Value, to_string};
///
/// let value = Value::from_iter([("KEY", "VALUE")]);
///
/// let value = to_string(&value).expect("Failed to serialize to string");
/// println!("{}", value);
/// ```
pub fn to_string<T>(v: &T) -> Result<String>
where
    T: serde::ser::Serialize,
{
    to_string_inner(None, v)
}

pub fn to_string_inner<T>(prefix: Option<&str>, v: &T) -> Result<String>
where
    T: serde::ser::Serialize,
{
    let mut serializer = Serializer::new(prefix);
    v.serialize(&mut serializer)?;

    Ok(serializer.output)
}

/// Serialize data to a writer that implements `std::io::Write`.
///
/// # Example
///
/// ```
/// use std::io::Cursor;
/// use serde_envfile::{Value, to_writer};
///
/// let value = Value::from_iter([("KEY", "VALUE")]);
///
/// let mut writer = Cursor::new(Vec::new());
/// to_writer(&mut writer, &value).expect("Failed to serialize to writer");
///
/// let output = String::from_utf8(writer.into_inner()).expect("Invalid UTF-8 sequence");
/// println!("{}", output);
/// ```
pub fn to_writer<W, T>(writer: W, v: &T) -> Result<()>
where
    W: std::io::Write,
    T: serde::ser::Serialize,
{
    to_writer_inner(None, writer, v)
}

pub(crate) fn to_writer_inner<W, T>(prefix: Option<&str>, mut writer: W, v: &T) -> Result<()>
where
    W: std::io::Write,
    T: serde::ser::Serialize,
{
    writer
        .write_all(to_string_inner(prefix, v)?.as_bytes())
        .map_err(Error::new)
}

/// Serialize data into an environment variable file.
///
/// # Example
///
/// ```no_run
/// use std::path::PathBuf;
/// use serde_envfile::{Value, to_file};
///
/// let value = Value::from_iter([("KEY", "VALUE")]);
/// let path = PathBuf::from(".env");
///
/// to_file(&path, &value).expect("Failed to serialize to file");
/// ```
pub fn to_file<P, T>(path: P, v: &T) -> Result<()>
where
    P: AsRef<Path>,
    T: serde::ser::Serialize,
{
    to_file_inner(None, path, v)
}

pub fn to_file_inner<P, T>(prefix: Option<&str>, path: P, v: &T) -> Result<()>
where
    P: AsRef<Path>,
    T: serde::ser::Serialize,
{
    let file = File::create(path).map_err(Error::new)?;
    to_writer_inner(prefix, file, v)
}

impl serde::ser::Serializer for &mut Serializer {
    type Ok = ();
    type Error = Error;

    type SerializeSeq = Self;
    type SerializeTuple = Self;
    type SerializeTupleStruct = Self;
    type SerializeTupleVariant = Self;
    type SerializeMap = Self;
    type SerializeStruct = Self;
    type SerializeStructVariant = Self;

    fn serialize_bool(self, v: bool) -> Result<()> {
        debug!("serialize bool: {}", v);
        self.output += if v { "true" } else { "false" };
        Ok(())
    }

    fn serialize_i8(self, v: i8) -> Result<()> {
        debug!("serialize i8: {}", v);
        self.serialize_i64(i64::from(v))
    }

    fn serialize_i16(self, v: i16) -> Result<()> {
        debug!("serialize i16: {}", v);
        self.serialize_i64(i64::from(v))
    }

    fn serialize_i32(self, v: i32) -> Result<()> {
        debug!("serialize i32: {}", v);
        self.serialize_i64(i64::from(v))
    }

    fn serialize_i64(self, v: i64) -> Result<()> {
        debug!("serialize i64: {}", v);
        self.output += &v.to_string();
        Ok(())
    }

    fn serialize_u8(self, v: u8) -> Result<()> {
        debug!("serialize u8: {}", v);
        self.serialize_u64(u64::from(v))
    }

    fn serialize_u16(self, v: u16) -> Result<()> {
        debug!("serialize u16: {}", v);
        self.serialize_u64(u64::from(v))
    }

    fn serialize_u32(self, v: u32) -> Result<()> {
        debug!("serialize u32: {}", v);
        self.serialize_u64(u64::from(v))
    }

    fn serialize_u64(self, v: u64) -> Result<()> {
        debug!("serialize u64: {}", v);
        self.output += &v.to_string();
        Ok(())
    }

    fn serialize_f32(self, v: f32) -> Result<()> {
        debug!("serialize f32: {}", v);
        self.serialize_f64(f64::from(v))
    }

    fn serialize_f64(self, v: f64) -> Result<()> {
        debug!("serialize f64: {}", v);
        self.output += &v.to_string();
        Ok(())
    }

    fn serialize_char(self, v: char) -> Result<()> {
        debug!("serialize char: {}", v);
        self.serialize_str(&v.to_string())
    }

    fn serialize_str(self, v: &str) -> Result<()> {
        debug!("serialize &str: {}", v);

        if self.key {
            let mut key = self.base_prefix.clone();
            if !self.prefix.is_empty() {
                self.prefix.push('_');
            }
            self.prefix += &v.to_uppercase();
            key += &self.prefix;
            if key.find(' ').is_some()
                || key.find('#').is_some()
                || key.find('\"').is_some()
                || key.find('\'').is_some()
            {
                return Err(Error::Syntax);
            }

            self.output += &key;
        } else if !v.is_empty() {
            self.output += "\"";
            self.output += v;
            self.output += "\"";
        }
        Ok(())
    }

    fn serialize_bytes(self, v: &[u8]) -> Result<()> {
        debug!("serialize bytes: {:?}", v);
        self.serialize_str(&String::from_utf8(v.to_vec()).map_err(|_| Error::Syntax)?)
    }

    fn serialize_none(self) -> Result<()> {
        debug!("serialize none");
        self.serialize_unit()
    }

    fn serialize_some<T>(self, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize some");
        value.serialize(self)
    }

    fn serialize_unit(self) -> Result<()> {
        debug!("serialize unit");
        Ok(())
    }

    fn serialize_unit_struct(self, _name: &'static str) -> Result<()> {
        debug!("serialize unit struct: {}", _name);
        self.serialize_unit()
    }

    fn serialize_unit_variant(
        self,
        _name: &'static str,
        _variant_index: u32,
        variant: &'static str,
    ) -> Result<()> {
        debug!("serialize unit variant: {}", variant);
        self.serialize_str(variant)
    }

    fn serialize_newtype_struct<T>(self, _name: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize newtype struct: {}", _name);
        value.serialize(self)
    }

    fn serialize_newtype_variant<T>(
        self,
        _name: &'static str,
        _variant_index: u32,
        variant: &'static str,
        value: &T,
    ) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize newtype struct variant: {}", variant);
        if self.sequence {
            return value.serialize(&mut *self);
        }

        self.key = true;
        variant.serialize(&mut *self)?;
        self.key = false;
        self.output += "=";
        value.serialize(&mut *self)?;
        self.output += "\n";
        Ok(())
    }

    fn serialize_seq(self, _len: Option<usize>) -> Result<Self::SerializeSeq> {
        debug!("serialize sequence");
        if self.sequence {
            return Err(Error::UnsupportedStructureInSeq);
        }
        self.sequence = true;
        Ok(self)
    }

    fn serialize_tuple(self, len: usize) -> Result<Self::SerializeTuple> {
        debug!("serialize tuple");
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_struct(
        self,
        _name: &'static str,
        len: usize,
    ) -> Result<Self::SerializeTupleStruct> {
        debug!("serialize tuple struct");
        self.serialize_seq(Some(len))
    }

    fn serialize_tuple_variant(
        self,
        _name: &'static str,
        _variant_index: u32,
        _variant: &'static str,
        _len: usize,
    ) -> Result<Self::SerializeTupleVariant> {
        debug!("serialize tuple variant");
        Ok(self)
    }

    fn serialize_map(self, _len: Option<usize>) -> Result<Self::SerializeMap> {
        debug!("serialize map");
        if self.sequence {
            return Err(Error::UnsupportedStructureInSeq);
        }
        Ok(self)
    }

    fn serialize_struct(self, _name: &'static str, len: usize) -> Result<Self::SerializeStruct> {
        debug!("serialize struct: {}", _name);
        self.serialize_map(Some(len))
    }

    fn serialize_struct_variant(
        self,
        _name: &'static str,
        _variant_index: u32,
        _variant: &'static str,
        len: usize,
    ) -> Result<Self::SerializeStructVariant> {
        debug!("serialize struct variant: {}/{}", _name, _variant);
        self.serialize_map(Some(len))
    }
}

impl serde::ser::SerializeSeq for &mut Serializer {
    type Ok = ();
    type Error = Error;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serializing sequence element");
        let r = value.serialize(&mut **self);
        self.output += ",";
        r
    }

    fn end(self) -> Result<()> {
        debug!("ended serializing sequence element");
        self.output.pop();
        self.sequence = false;
        self.strip_line_breaks();
        Ok(())
    }
}

impl serde::ser::SerializeTuple for &mut Serializer {
    type Ok = ();
    type Error = Error;

    fn serialize_element<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize tuple element");
        let r = value.serialize(&mut **self);
        self.output += ",";
        r
    }

    fn end(self) -> Result<()> {
        debug!("ended serializing tuple element");
        self.output.pop();
        self.sequence = false;
        self.strip_line_breaks();
        Ok(())
    }
}

impl serde::ser::SerializeTupleStruct for &mut Serializer {
    type Ok = ();
    type Error = Error;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize tuple struct field");
        let r = value.serialize(&mut **self);
        self.output += ",";
        r
    }

    fn end(self) -> Result<()> {
        debug!("ended serializing tuple struct field");
        self.output.pop();
        self.sequence = false;
        Ok(())
    }
}

impl serde::ser::SerializeTupleVariant for &mut Serializer {
    type Ok = ();
    type Error = Error;

    fn serialize_field<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize tuple variant field");
        let r = value.serialize(&mut **self);
        self.output += ",";
        r
    }

    fn end(self) -> Result<()> {
        debug!("ended serializing tuple variant field");
        self.output.pop();
        self.sequence = false;
        Ok(())
    }
}

impl serde::ser::SerializeMap for &mut Serializer {
    type Ok = ();
    type Error = Error;

    fn serialize_key<T>(&mut self, key: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize map key");
        serialize_map_struct_key(self, key)
    }

    fn serialize_value<T>(&mut self, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serialize map value");
        serialize_map_struct_value(self, value)
    }

    fn end(self) -> Result<()> {
        debug!("ended serializing map");
        self.strip_line_breaks();
        Ok(())
    }
}

impl serde::ser::SerializeStruct for &mut Serializer {
    type Ok = ();
    type Error = Error;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serializing struct field");

        serialize_field(self, key, value)
    }

    fn end(self) -> Result<()> {
        debug!("ended serializing struct field");
        self.strip_line_breaks();
        Ok(())
    }
}

impl serde::ser::SerializeStructVariant for &mut Serializer {
    type Ok = ();
    type Error = Error;

    fn serialize_field<T>(&mut self, key: &'static str, value: &T) -> Result<()>
    where
        T: ?Sized + serde::ser::Serialize,
    {
        debug!("serializing struct variant field");

        serialize_field(self, key, value)
    }

    fn end(self) -> Result<()> {
        debug!("ended serializing struct variant");
        self.strip_line_breaks();
        Ok(())
    }
}

fn serialize_field<T>(ser: &'_ mut &'_ mut Serializer, key: &'static str, value: &T) -> Result<()>
where
    T: ?Sized + serde::ser::Serialize,
{
    serialize_map_struct_key(ser, key)?;
    serialize_map_struct_value::<T>(ser, value)?;
    Ok(())
}

fn serialize_map_struct_key<T>(ser: &'_ mut &'_ mut Serializer, key: &T) -> Result<()>
where
    T: ?Sized + serde::ser::Serialize,
{
    if ser.sequence {
        return Err(Error::UnsupportedStructureInSeq);
    }

    ser.prefix_before = ser.prefix.clone();

    let prefix = format!("{}{}", ser.prefix, '=');
    if ser.output.ends_with(&prefix) {
        ser.output = ser.output[..ser.output.len() - prefix.len()].into();
    }

    ser.key = true;
    key.serialize(&mut **ser)?;
    ser.key = false;
    Ok(())
}

fn serialize_map_struct_value<T>(ser: &'_ mut &'_ mut Serializer, value: &T) -> Result<()>
where
    T: ?Sized + serde::ser::Serialize,
{
    if ser.sequence {
        return Err(Error::UnsupportedStructureInSeq);
    }

    ser.output += "=";
    value.serialize(&mut **ser)?;
    ser.output += "\n";

    ser.prefix = ser.prefix_before.clone();
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{collections::HashMap, io::Cursor};

    use super::{to_file, to_string, to_writer};
    use crate::{Value, from_str};

    #[test]
    fn serialize_to_string_value() {
        //* Given
        // TODO: Review this test case, the key is "hello" but the expected is "HELLO"
        let env = Value::from_iter([("hello", "WORLD")]);

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "HELLO=\"WORLD\"";
        assert_eq!(expected, &output);

        // Assert the deserialized value is equal to the original value
        let deserialized = from_str::<Value>(&output).expect("Failed to deserialize to value");
        assert_eq!(deserialized, env);
    }

    #[test]
    fn serialize_to_string_struct() {
        //* Given
        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct StructTestNested {
            c: u8,
        }

        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct StructTest {
            a: u8,
            b: StructTestNested,
        }

        let env = StructTest {
            a: 1,
            b: StructTestNested { c: 2 },
        };

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        assert_eq!("A=1\nB_C=2", output);
    }

    #[test]
    fn serialize_to_string_sequence() {
        //* Given

        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct SeqTest {
            a: Vec<String>,
            b: String,
        }

        let env = SeqTest {
            a: vec!["HELLO".into(), "WORLD".into()],
            b: "control value".into(),
        };

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "A=\"HELLO\",\"WORLD\"\nB=\"control value\"";
        assert_eq!(expected, &output);

        // Assert the deserialized value is equal to the original value
        let deserialized = from_str::<SeqTest>(&output).expect("Failed to deserialize to struct");
        assert_eq!(deserialized, env);
    }

    #[test]
    fn serialize_to_string_enum() {
        //* Given
        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        enum EnumTestEnum {
            HELLO,
            WORLD,
        }

        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct EnumTest {
            a: EnumTestEnum,
        }

        let env = EnumTest {
            a: EnumTestEnum::HELLO,
        };

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "A=\"HELLO\"";
        assert_eq!(expected, &output);

        // Assert the deserialized value is equal to the original value
        let deserialized = from_str::<EnumTest>(&output).expect("Failed to deserialize to struct");
        assert_eq!(deserialized, env);
    }

    #[test]
    fn serialize_to_string_numbers() {
        //* Given
        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct NumberTest {
            u8: u8,
            u16: u16,
            u32: u32,
            u64: u64,
            i8: i8,
            i16: i16,
            i32: i32,
            i64: i64,
            f32: f32,
            f64: f64,
            usize: usize,
        }

        let env = NumberTest {
            u8: 255,
            u16: 65535,
            u32: 4294967295,
            u64: 18446744073709551615,
            i8: -128,
            i16: -32768,
            i32: -2147483648,
            i64: -9223372036854775808,
            f32: -3.5,
            f64: 3.5,
            usize: 18446744073709551615,
        };

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "U8=255\nU16=65535\nU32=4294967295\nU64=18446744073709551615\nI8=-128\nI16=-32768\nI32=-2147483648\nI64=-9223372036854775808\nF32=-3.5\nF64=3.5\nUSIZE=18446744073709551615";
        assert_eq!(expected, &output);

        // Assert the deserialized value is equal to the original value
        let deserialized = from_str::<NumberTest>(&output).expect("Failed to deserialize to struct");
        assert_eq!(deserialized, env);
    }

    #[test]
    fn serialize_to_string_bool() {
        //* Given
        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct BoolTest {
            a: bool,
            b: bool,
        }

        let env = BoolTest { a: true, b: false };

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "A=true\nB=false";
        assert_eq!(expected, &output);

        // Assert the deserialized value is equal to the original value
        let deserialized = from_str::<BoolTest>(&output).expect("Failed to deserialize to struct");
        assert_eq!(deserialized, env);
    }

    #[test]
    fn serialize_to_string_option() {
        //* Given
        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct OptionTest {
            a: Option<String>,
            b: Option<String>,
        }

        let env = OptionTest {
            a: Some("HELLO".into()),
            b: None,
        };

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "A=\"HELLO\"\nB=";
        assert_eq!(expected, &output);

        // Assert the deserialized value is equal to the original value
        // NOTE: envy deserializes "" with Some()
        let deserialized = from_str::<OptionTest>(&output).expect("Failed to deserialize to struct");
        assert_eq!(deserialized.a, env.a);
    }

    #[test]
    fn serialize_to_string_hashmap() {
        //* Given
        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct MapTest {
            #[serde(flatten)]
            inner: HashMap<String, String>,
        }

        let mut env = MapTest {
            inner: HashMap::new(),
        };
        env.inner.insert("hello".into(), "WORLD".into());

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "HELLO=\"WORLD\"";
        assert_eq!(expected, &output);

        // Assert the deserialized value is equal to the original value
        let deserialized = from_str::<MapTest>(&output).expect("Failed to deserialize to struct");
        assert_eq!(deserialized, env);
    }

    #[test]
    fn serialize_to_string_nested_hashmap() {
        //* Given
        #[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
        struct NestedMapTest {
            inner: HashMap<String, String>,
        }

        let env = NestedMapTest {
            inner: HashMap::from([("HELLO".into(), "WORLD".into())]),
        };

        //* When
        let output = to_string(&env).expect("Failed to serialize to string");

        //* Then
        let expected = "INNER_HELLO=\"WORLD\"";
        assert_eq!(expected, &output);
    }

    #[test]
    fn serialize_to_writer() {
        //* Given
        let env = Value::from_iter([("HELLO", "WORLD")]);

        let mut writer = Cursor::new(Vec::new());

        //* When
        to_writer(&mut writer, &env).expect("Failed to serialize to writer");

        //* Then
        let expected_output = "HELLO=\"WORLD\"";
        let output = String::from_utf8(writer.into_inner()).expect("Invalid UTF-8 sequence");
        assert_eq!(expected_output, output);
    }

    #[test]
    fn serialize_to_file() {
        //* Given
        let env = Value::from_iter([("HELLO", "WORLD")]);

        // Create a temp file in the system's temp directory, so if the test fails, the file does not clutter the current directory
        let file = tempfile::NamedTempFile::new_in(std::env::temp_dir()).expect("Failed to create temp file");

        //* When
        to_file(&file.path(), &env).expect("Failed to serialize to file");

        //* Then
        let expected_output = "HELLO=\"WORLD\"";
        let output = std::fs::read_to_string(file.path()).expect("Failed to read file");
        assert_eq!(expected_output, output);
    }
}
