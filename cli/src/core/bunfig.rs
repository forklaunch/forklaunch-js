use std::path::Path;

use anyhow::Result;

use super::rendered_template::RenderedTemplate;

/// Bun equivalent of pnpm_workspace.rs's minimumReleaseAge default. Bun's
/// [install] table takes seconds, not minutes: 86400 = 24h, matching pnpm's
/// 1440-minute default and forklaunch-platform's own pnpm-workspace.yaml.
/// Same rationale: pin it explicitly so a scaffold's local `bun install`
/// resolves under the same age policy the deploy pipeline enforces, rather
/// than locking in fresh versions the pipeline's bun then rejects.
const BUNFIG_TOML: &str = "[install]\nminimumReleaseAge = 86400\n";

pub(crate) fn generate_bunfig(application_path: &str) -> Result<Option<RenderedTemplate>> {
    let bunfig_path = Path::new(application_path).join("bunfig.toml");
    if bunfig_path.exists() {
        return Ok(None);
    }

    Ok(Some(RenderedTemplate {
        path: bunfig_path,
        content: BUNFIG_TOML.to_string(),
        context: None,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_bunfig_pins_minimum_release_age() {
        let dir = tempfile::tempdir().unwrap();
        let rendered = generate_bunfig(dir.path().to_str().unwrap())
            .unwrap()
            .unwrap();
        assert!(rendered.content.contains("minimumReleaseAge = 86400"));
    }

    #[test]
    fn test_generate_bunfig_skips_existing_file() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("bunfig.toml"), "# existing\n").unwrap();
        let rendered = generate_bunfig(dir.path().to_str().unwrap()).unwrap();
        assert!(rendered.is_none());
    }
}
