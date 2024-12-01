use std::{
    env::current_exe,
    fs::{create_dir_all, read_dir, write},
    path::Path,
};

use anyhow::Result;
use ramhorns::{Content, Ramhorns};

use super::config::Config;

#[derive(Debug)]
pub(crate) struct PathIO {
    pub(crate) input_path: String,
    pub(crate) output_path: String,
}

pub(crate) fn get_template_path(path: &PathIO) -> Result<String> {
    Ok(current_exe()?
        .parent()
        .unwrap()
        .join(&path.input_path)
        .to_string_lossy()
        .to_string())
}

pub(crate) fn setup_with_template<T: Content + Config>(
    output_prefix: Option<&String>,
    template_dir: &PathIO,
    template: &mut Ramhorns,
    data: &T,
    ignore_files: &Vec<String>,
) -> Result<()> {
    let output_dir = match output_prefix {
        Some(output_prefix) => Path::new(output_prefix).join(&template_dir.output_path),
        None => Path::new(&template_dir.output_path).to_path_buf(),
    };

    for entry in read_dir(get_template_path(&template_dir)?)? {
        let entry = entry?;
        let path = entry.path();

        let output_path = output_dir.join(path.file_name().unwrap());
        if !output_path.exists() {
            create_dir_all(output_path.parent().unwrap())?;
        }

        if path.is_file() {
            let tpl = template.from_file(&path.to_str().unwrap())?;
            let rendered = tpl.render(&data);
            if !output_path.exists()
                && !ignore_files
                    .iter()
                    .any(|ignore_file| output_path.to_str().unwrap().contains(ignore_file))
            {
                write(output_path, rendered)?;
            }
        } else if path.is_dir() {
            setup_with_template(
                output_prefix,
                &PathIO {
                    input_path: Path::new(&template_dir.input_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                    output_path: Path::new(&template_dir.output_path)
                        .join(&entry.file_name())
                        .to_string_lossy()
                        .to_string(),
                },
                template,
                data,
                ignore_files,
            )?;
        }
    }

    Ok(())
}
