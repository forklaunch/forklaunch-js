use std::path::Path;

use anyhow::Result;
use base64::{engine::general_purpose::STANDARD, Engine};
use rcgen::KeyPair;

use super::rendered_template::RenderedTemplate;

pub(crate) fn generate_iam_keys(base_path: &Path) -> Result<Vec<RenderedTemplate>> {
    let mut rendered_templates = Vec::new();
    let key_pair = KeyPair::generate()?;

    let private_key_pem = format!(
        "-----BEGIN PRIVATE KEY-----\n{}\n-----END PRIVATE KEY-----",
        STANDARD.encode(key_pair.serialize_der())
    );
    rendered_templates.push(RenderedTemplate {
        path: base_path.join("iam").join("private.pem"),
        content: private_key_pem,
        context: None,
    });

    let public_key_pem = format!(
        "-----BEGIN PUBLIC KEY-----\n{}\n-----END PUBLIC KEY-----",
        STANDARD.encode(key_pair.public_key_der())
    );
    rendered_templates.push(RenderedTemplate {
        path: base_path.join("iam").join("public.pem"),
        content: public_key_pem,
        context: None,
    });

    Ok(rendered_templates)
}
