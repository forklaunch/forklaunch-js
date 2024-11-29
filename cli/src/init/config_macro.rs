#[macro_export]
macro_rules! internal_config_struct {
    (
        $(#[$meta:meta])*
        $vis:vis struct $name:ident {
            $(
                $(#[$field_meta:meta])*
                $field_vis:vis $field:ident: $ty:ty
            ),*
            $(,)?
        }
    ) => {
        $(#[$meta])*
        $vis struct $name {
            $vis cli_version: String,
            $vis app_name: String,
            $vis validator: String,
            $vis http_framework: String,
            $vis runtime: String,
            $vis test_framework: String,
            $vis generated_projects: Vec<String>,
            $vis project_peer_topology: std::collections::HashMap<String, Vec<String>>,

            $(
                #[serde(default)]
                $(#[$field_meta])*
                $field_vis $field: $ty
            ),*
        }
    };
}

#[macro_export]
macro_rules! config_struct {
        (
            $(#[$meta:meta])*
            $vis:vis struct $name:ident {
                $(
                    $(#[$field_meta:meta])*
                    $field_vis:vis $field:ident: $ty:ty
                ),*
                $(,)?
            }
        ) => {
            crate::internal_config_struct! {
                $(#[$meta])*
                $vis struct $name {
                    #[serde(skip_serializing)]
                    $vis is_express: bool,

                    #[serde(skip_serializing)]
                    $vis is_hyper_express: bool,

                    #[serde(skip_serializing)]
                    $vis is_zod: bool,

                    #[serde(skip_serializing)]
                    $vis is_typebox: bool,

                    #[serde(skip_serializing)]
                    $vis is_bun: bool,

                    #[serde(skip_serializing)]
                    $vis is_node: bool,

                    #[serde(skip_serializing)]
                    $vis is_vitest: bool,

                    #[serde(skip_serializing)]
                    $vis is_jest: bool,

                    $(
                        $(#[$field_meta])*
                        $field_vis $field: $ty
                    ),*
                }
            }

         crate::internal_config_struct! {
                $(#[$meta])*
                #[derive(Deserialize)]
                struct Shadow {
                    $(
                        $(#[$field_meta])*
                        $field_vis $field: $ty
                    ),*
                }
            }

        impl From<Shadow> for $name {
            fn from(shadow: Shadow) -> Self {
                Self {
                    cli_version: shadow.cli_version.clone(),
                    app_name: shadow.app_name.clone(),
                    validator: shadow.validator.clone(),
                    http_framework: shadow.http_framework.clone(),
                    runtime: shadow.runtime.clone(),
                    test_framework: shadow.test_framework.clone(),
                    generated_projects: shadow.generated_projects.clone(),
                    project_peer_topology: shadow.project_peer_topology.clone(),
                    is_express: shadow.http_framework == "express",
                    is_hyper_express: shadow.http_framework == "hyper-express",
                    is_zod: shadow.validator == "zod",
                    is_typebox: shadow.validator == "typebox",
                    is_bun: shadow.runtime == "bun",
                    is_node: shadow.runtime == "node",
                    is_vitest: shadow.test_framework == "vitest",
                    is_jest: shadow.test_framework == "jest",
                    $(
                        $field: shadow.$field
                    ),*
                }
            }
        }

        impl<'de> Deserialize<'de> for $name {
            fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
                let shadow: Shadow = Deserialize::deserialize(deserializer)?;
                Ok(shadow.into())
            }
        }

        impl crate::init::Config for $name {
            fn test_framework(&self) -> &String {
                &self.test_framework
            }
        }
    };
}
