use convert_case::{Case, Casing};
use ramhorns::Content;
use serde::{Deserialize, Serialize};

use super::{
    InitializableManifestConfig, InitializableManifestConfigMetadata, ProjectManifestConfig,
};
use crate::config_struct;

config_struct!(
    #[derive(Debug, Content, Serialize, Clone)]
    pub(crate) struct LibraryManifestData {
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) library_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) camel_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) kebab_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) title_case_name: String,
        #[serde(skip_serializing, skip_deserializing)]
        pub(crate) description: String,
    }
);

impl ProjectManifestConfig for LibraryManifestData {
    fn name(&self) -> &String {
        &self.library_name
    }
    fn description(&self) -> &String {
        &self.description
    }
}

impl InitializableManifestConfig for LibraryManifestData {
    fn initialize(&self, metadata: InitializableManifestConfigMetadata) -> Self {
        let library_metadata = match metadata {
            InitializableManifestConfigMetadata::Project(library_metadata) => library_metadata,
            _ => unreachable!(),
        };
        let library_name = library_metadata.project_name.clone();
        let project_entry = self
            .projects
            .iter()
            .find(|p| p.name == library_metadata.project_name.clone())
            .unwrap();
        Self {
            library_name: library_name.clone(),
            camel_case_name: library_name.clone().to_case(Case::Camel),
            kebab_case_name: library_name.clone().to_case(Case::Kebab),
            description: library_metadata
                .description
                .clone()
                .unwrap_or(project_entry.description.clone()),
            ..self.clone()
        }
    }
}
