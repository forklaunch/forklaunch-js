---
title: CLI Reference - config
category: References
description: Learn how to use the forklaunch config command.
---

## Overview

The `config` command manages application configuration between your local environment and the ForkLaunch platform. You must be authenticate to use this command.

## Usage

```bash
forklaunch config [COMMAND]
```

### Available Commands

| Command | Description | Options |
| :------ | :---------- | :------- |
| `pull <id>` | Download configuration from platform | `-o, --output` - Save to specific file |
| `push <id>` | Upload configuration to platform | `-i, --input` - Read from specific file |

### Examples

```bash
# Pull configuration to working directory
forklaunch config pull my-config-id

# Pull configuration to specific file
forklaunch config pull my-config-id --output ./config/.env.prod

# Push configuration from working directory
forklaunch config push my-config-id

# Push configuration from specific file
forklaunch config push my-config-id --input ./config/.env.prod
```

### Notes

- Configuration IDs must be unique within your platform account
- Default configuration locations are determined by your project structure
- Use different IDs for different environments (development, staging, production)
