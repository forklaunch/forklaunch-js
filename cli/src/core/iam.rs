use base64::{Engine, engine::general_purpose::STANDARD};
use rand::RngCore;

pub(crate) fn generate_iam_secret() -> String {
    let mut secret_bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut secret_bytes);
    STANDARD.encode(secret_bytes)
}
