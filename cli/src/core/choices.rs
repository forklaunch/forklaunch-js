#[macro_export]
macro_rules! count {
    () => (0usize);
    ($x:tt $($xs:tt)*) => (1usize + crate::count!($($xs)*));
}

#[derive(Debug, Clone, PartialEq)]
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
            #[repr(usize)]
            #[derive(Debug, Copy, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
            $(#[$meta_attr])*
            $vis enum $name {
                $(
                    $variant,
                )*
            }

            impl $name {
                #[allow(dead_code)]
                $vis const VARIANTS: [&'static str; crate::count!($($variant)*)] = [
                    $($meta.id),*
                ];

                #[allow(dead_code)]
                $vis const ALL_FILES: &'static [&'static str] = {
                    const fn count_files() -> usize {
                        let mut count = 0;
                        $(
                            if let Some(files) = $meta.exclusive_files {
                                count += files.len();
                            }
                        )*
                        count
                    }
                    const LEN: usize = count_files();
                    const fn collect_files() -> [&'static str; LEN] {
                        let mut result = [""; LEN];
                        let mut i = 0;
                        $(
                            if let Some(files) = $meta.exclusive_files {
                                let mut j = 0;
                                while j < files.len() {
                                    result[i] = files[j];
                                    i += 1;
                                    j += 1;
                                }
                            }
                        )*
                        result
                    }
                    &collect_files()
                };

                const METADATA: &'static [Choice] = &[
                    $($meta),*
                ];

                $vis fn metadata(&self) -> &'static Choice {
                    match self {
                        $(
                           Self::$variant => &Self::METADATA[*self as usize],
                        )*
                    }
                }

                #[allow(dead_code)]
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

                #[allow(dead_code)]
                $vis fn get_variant_from_exclusive_file(file_name: &str) -> Option<&'static str> {
                    for metadata in Self::METADATA.iter() {
                        if let Some(files) = &metadata.exclusive_files {
                            if files.contains(&file_name) {
                                return Some(metadata.id);
                            }
                        }
                    }
                    None
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
