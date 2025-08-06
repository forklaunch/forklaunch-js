# Check Blueprint Dependencies

This tool verifies that the version constants in `cli/src/core/package_json/package_json_constants.rs` match the actual versions found in package.json files across the ForkLaunch blueprint.

## Usage

### Check Mode (Default)
```bash
cargo run
```
This will check all package.json files and report any version mismatches with the constants file without making changes.

### Fix Mode
```bash
cargo run -- --fix
# or
cargo run -- -f
```
This will automatically update the constants file with the correct versions from package.json files.

## What it does

1. **Scans package.json files** in:
   - Blueprint projects (from manifest.toml)
   - Implementation directories
   - Interface directories
   - Framework infrastructure
   - Framework internal
2. **Collects actual versions** from all dependencies and package versions
3. **Compares with constants** in `cli/src/core/package_json/package_json_constants.rs` and either:
   - Reports mismatches (check mode)
   - Updates constants file with correct versions (fix mode)

## How it works

The tool reads the comment format in the constants file:
```rust
// @forklaunch/core,@forklaunch/express
pub(crate) const CORE_VERSION: &str = "~0.12.0";
```

It then:
1. Collects actual versions of `@forklaunch/core` and `@forklaunch/express` from package.json files
2. If the constants file version doesn't match, it updates the constant to match the actual version
3. **Preserves the leading character** (`~` or `^`) from the original constant when writing

### Version Constraint Behavior

**Check Mode**: Ignores leading characters (`~` and `^`) when comparing versions
- `~0.5.0` and `^0.5.0` are considered the same version
- Only reports mismatches when the actual version numbers differ

**Fix Mode**: Preserves the leading character from the constants file when writing
- If constants file has `~0.5.0` but package.json has `^0.5.1`, updates to `~0.5.1`
- Maintains the semantic meaning of version constraints

**Version Constraint Meanings**:
- `~` (tilde): Allows patch-level changes (e.g., `~1.2.3` allows `1.2.4` but not `1.3.0`)
- `^` (caret): Allows minor-level changes (e.g., `^1.2.3` allows `1.3.0` but not `2.0.0`)

## Safety

- The tool only updates constants that are explicitly defined in the constants file
- It preserves the file structure and formatting
- It preserves the semantic meaning of version constraints (`~` vs `^`)
- It skips workspace dependencies and other special version formats
- Always run in check mode first to see what would be changed

## Example Output

### Check Mode
```
Running in check mode - will only verify versions (use --fix to update)
Version mismatch for @forklaunch/core: constants file has ~0.12.0, but package.json has ~0.12.1
constants file: ../../../../cli/src/core/package_json/package_json_constants.rs:215
```

### Fix Mode
```
Running in fix mode - will update constants file with versions from package.json files
Updating @forklaunch/core version from ~0.12.0 to ~0.12.1
Updated 1 version constants in ../../../../cli/src/core/package_json/package_json_constants.rs
``` 