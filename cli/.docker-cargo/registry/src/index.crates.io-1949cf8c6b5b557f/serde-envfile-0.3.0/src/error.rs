use std::fmt::Display;

use serde::{de, ser};

pub type Result<T> = std::result::Result<T, Error>;

/// Possible errors.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Message(String),

    #[error("Unexpected end of input")]
    Eof,
    #[error("Syntax error")]
    Syntax,
    #[error("Expected boolean")]
    ExpectedBoolean,
    #[error("Expected integer")]
    ExpectedInteger,
    #[error("Tuple structs are not supported")]
    UnsupportedTupleStruct,
    #[error("Unsupported structure in sequence")]
    UnsupportedStructureInSeq,
}

impl ser::Error for Error {
    fn custom<T: Display>(msg: T) -> Self {
        Error::Message(msg.to_string())
    }
}

impl de::Error for Error {
    fn custom<T: Display>(msg: T) -> Self {
        Error::Message(msg.to_string())
    }
}

impl Error {
    pub fn new<E>(e: E) -> Self
    where
        E: std::error::Error,
    {
        Self::Message(e.to_string())
    }
}