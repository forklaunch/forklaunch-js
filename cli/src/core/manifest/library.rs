use ramhorns::Content;
use serde::{Deserialize, Serialize};

use super::ProjectManifestConfig;
use crate::config_struct;

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct LibraryManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) library_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) camel_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
    }
);

impl ProjectManifestConfig for LibraryManifestData {
    fn name(&self) -> &String {
        &self.library_name
    }
}
