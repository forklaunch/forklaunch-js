#[macro_export]
macro_rules! count {
    () => (0usize);
    ($x:tt $($xs:tt)*) => (1usize + crate::count!($($xs)*));
}

pub(crate) struct Choice {
    pub id: &'static str,
    pub exclusive_files: Option<&'static [&'static str]>,
}

#[macro_export]
macro_rules! choice {
    (
        $(
            $(#[$meta_attr:meta])*
            $vis:vis enum $name:ident {
                $(
                    $variant:ident = $meta:expr
                ),* $(,)?
            }
        )+
    ) => {
        $(
            #[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
            $(#[$meta_attr])*
            $vis enum $name {
                $(
                    $variant,
                )*
            }

            impl $name {
                $vis const VARIANTS: [&'static str; crate::count!($($variant)*)] = [
                    $($meta.id),*
                ];

                const METADATA: &'static [Choice] = &[
                    $($meta),*
                ];

                $vis fn metadata(&self) -> &'static Choice {
                    match self {
                        $(
                            Self::$variant => &Self::METADATA[crate::count!($variant*)],
                        )*
                    }
                }

                $vis fn all_other_files(&self) -> Vec<&'static str> {
                    let self_files = self.metadata().exclusive_files.unwrap_or_default();

                    let mut all_files = Vec::new();
                    for metadata in Self::METADATA.iter() {
                        if let Some(files) = &metadata.exclusive_files {
                            for &file in files.iter() {
                                if !self_files.contains(&file) {
                                    all_files.push(file);
                                }
                            }
                        }
                    }
                    all_files
                }
            }

            impl ToString for $name {
                fn to_string(&self) -> String {
                    self.metadata().id.to_string()
                }
            }

            impl std::str::FromStr for $name {
                type Err = anyhow::Error;

                fn from_str(s: &str) -> Result<Self, Self::Err> {
                    match s {
                        $(
                            s if s == $meta.id => Ok(Self::$variant),
                        )*
                        _ => anyhow::bail!("Invalid {}: {}", stringify!($name), s)
                    }
                }
            }
        )+
    }
}
