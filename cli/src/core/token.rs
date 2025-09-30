use std::{
    env::var,
    fs::read_to_string,
    path::{Path, PathBuf},
};

use anyhow::{Result, bail};

pub(crate) fn get_token_path() -> Result<PathBuf> {
    Ok(Path::new(&var("HOME")?).join(".forklaunch").join("token"))
}

pub(crate) fn get_token() -> anyhow::Result<String> {
    let home_path = get_token_path()?;
    if !home_path.exists() {
        bail!("No token found. Please run `forklaunch login` to get a token");
    }

    Ok(read_to_string(&home_path)?.trim().to_string())
}
