use std::path::{Path, PathBuf};

pub(crate) fn get_relative_path(from: &Path, to: &Path) -> PathBuf {
    let mut from_components = from.components();
    let mut to_components = to.components();

    while let (Some(from_comp), Some(to_comp)) = (from_components.next(), to_components.next()) {
        if from_comp != to_comp {
            break;
        }
    }

    let mut result = PathBuf::new();
    for _ in from_components {
        result.push("..");
    }
    for comp in to_components {
        result.push(comp);
    }

    result
}
