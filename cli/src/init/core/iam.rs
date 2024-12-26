use anyhow::Result;
use base64::{engine::general_purpose::STANDARD, Engine};
use rcgen::KeyPair;
use std::{fs::write, path::Path};

pub(crate) fn setup_iam(base_path: &Path) -> Result<()> {
    let key_pair = KeyPair::generate()?;

    // Format private key with PKCS#8 headers
    let private_key_pem = format!(
        "-----BEGIN PRIVATE KEY-----\n{}\n-----END PRIVATE KEY-----",
        STANDARD.encode(key_pair.serialize_der())
    );
    write(base_path.join("iam").join("private.pem"), private_key_pem)?;

    // Format public key with SPKI headers
    let public_key_pem = format!(
        "-----BEGIN PUBLIC KEY-----\n{}\n-----END PUBLIC KEY-----",
        STANDARD.encode(key_pair.public_key_der())
    );
    write(base_path.join("iam").join("public.pem"), public_key_pem)?;

    Ok(())
}
