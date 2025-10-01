---
title: CLI Reference - config
category: References
description: Learn how to use the forklaunch config command.
---

## Overview

THIS COMMAND IS CURRENTLY UNDER DEVELOPMENT AND IS NOT YET AVAILABLE.

The `config` command manages application configuration between your local environment and the ForkLaunch platform. You must be authenticate to use this command.

## Usage

```bash
forklaunch config [COMMAND]
```

### Available Commands

| Command     | Description                          | Options                                 |
| :---------- | :----------------------------------- | :-------------------------------------- |
| `pull <id>` | Retrieves a configuration from the forklaunch platform | `-o, --output` - Path to the configuration file to push |
| `push <id>` | Push a configuration to the forklaunch platform | `-i, --input` - Path to the configuration file to push |

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

## Troubleshooting

**Error: "Authentication required"**

- Run `forklaunch login` to authenticate
- Check session status with `forklaunch whoami`

**Error: "Configuration not found"**

- Verify the configuration ID exists on the platform
- Check spelling and case sensitivity

**Error: "Permission denied"**

- Ensure you have access to the configuration
- Contact your organization admin if using team configurations

**Error: "File not found" (push)**

- Verify the input file path exists
- Check file permissions and accessibility

**Configuration conflicts**

- Review environment-specific configurations
- Ensure configuration IDs are unique per environment

## Related Commands

- [`forklaunch login`](./authentication.md) - Authenticate with platform
- [`forklaunch whoami`](./authentication.md) - Check authentication status

## Related Documentation

- **[Authentication Guide](./authentication.md)** - Platform authentication
