use anyhow::Result;
use rcgen::KeyPair;
use std::{fs::write, path::Path};

pub(crate) fn setup_iam(base_path: &Path) -> Result<()> {
    let key_pair = KeyPair::generate()?;

    let private_key_pem = key_pair.serialize_pem();
    write(base_path.join("iam").join("private.pem"), private_key_pem)?;

    // Serialize the public key to PEM format
    let public_key_pem = key_pair.public_key_pem();
    write(base_path.join("iam").join("public.pem"), public_key_pem)?;

    Ok(())
}
