---
title: Eject Command
category: CLI
description: Learn how to eject ForkLaunch dependencies to customize them.
---

## Overview

Copy ForkLaunch dependencies into your project for customization.

## Usage

```bash
forklaunch eject [OPTIONS]
```

## Options

| Option | Short | Description | Default |
|--------|--------|-------------|---------|
| `--base_path` | `-p` | The application path to eject from | Current directory |
| `--continue` | `-c` | Continue the eject operation without confirmation | `false` |
| `--dependencies` | `-d` | The dependencies to eject (can specify multiple) | Interactive selection |
| `--dryrun` | `-n` | Dry run the application (show what would be ejected) | `false` |

## Interactive Mode

When run without specifying dependencies, the command will:

1. **Scan for ejectable dependencies** - Only ForkLaunch packages can be ejected
2. **Show available options** - Display a list of ejectable dependencies
3. **Prompt for selection** - Allow you to choose which dependencies to eject
4. **Collision detection** - Check for file conflicts before proceeding
5. **Confirmation** - Ask for final confirmation (unless `--continue` is used)

## What Happens During Ejection

### 1. File Copying
- Source code is copied from `node_modules/@forklaunch/*` to your project
- Files maintain their directory structure
- Package metadata is preserved

### 2. Dependency Updates
- Ejected packages are removed from `package.json` dependencies
- Internal imports are updated to point to local files
- Index files are intelligently merged when conflicts exist

### 3. Import Path Rewriting
- Automatically updates import statements throughout your codebase
- Replaces package imports with relative file paths
- Handles nested dependencies correctly

## Examples

```bash
# Interactive selection
forklaunch eject

# Eject specific dependencies
forklaunch eject --dependencies @forklaunch/infrastructure-redis @forklaunch/service-billing

# Preview changes
forklaunch eject --dryrun --dependencies @forklaunch/service-iam

# Skip confirmation
forklaunch eject --continue --dependencies @forklaunch/infrastructure-redis

# Specify application path
forklaunch eject --base_path ./my-app --dependencies @forklaunch/service-iam
```

## File Collision Handling

- **Index.ts files**: Merged automatically, preserves existing exports
- **Other files**: Operation stops if conflicts detected

## Post-Ejection Notes

⚠️ **Important**: 
- Ejected code becomes your responsibility to maintain
- No automatic updates from ForkLaunch
- Test thoroughly after ejection

## Troubleshooting

**Error: "File collisions detected"**
- Review listed conflicting files
- Remove or rename existing files before ejecting

**Error: "Dependency not ejectable"**
- Only `@forklaunch/*` packages can be ejected
- Verify package name is correct

**Missing dependencies after ejection**
- Check `package.json` for missing transitive dependencies
- Install any missing packages manually



## Related Commands

- [`forklaunch depcheck`](./depcheck.md) - Check dependency alignment
- [`forklaunch change`](../changing-projects.md) - Modify ejected services

## Related Documentation

- **[Framework Documentation](../framework.md)** - Framework overview and features
- **[Customization Guide](../customization.md)** - Project customization options
