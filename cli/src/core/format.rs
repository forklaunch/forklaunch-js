use std::path::Path;

use crate::constants::Runtime;

pub(crate) fn format_code(base_path: &Path, runtime: &Runtime) {
    let command = match runtime {
        Runtime::Node => "pnpm",
        Runtime::Bun => "bun",
    };
    let _ = std::process::Command::new(command)
        .arg("format")
        .current_dir(base_path)
        .output();
}
