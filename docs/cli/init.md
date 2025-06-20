---
title: CLI Reference - init
category: References
description: Learn how to use the forklaunch init command.
---

## Overview

Create new ForkLaunch resources. For detailed information, see [Adding Projects](/docs/adding-projects).

## Usage

```bash
forklaunch init <COMMAND>
```

## Available Commands

### Initialize Application
```bash
forklaunch init application [options]
```

| Option | Description | Values |
| :----- | :---------- | :----- |
| `-d, --database` | Database type | `postgresql`, `mongodb` |
| `-v, --validator` | Schema validator | `zod`, `typebox` |
| `-f, --http-framework` | HTTP framework | `express`, `hyper-express` |
| `-r, --runtime` | Runtime environment | `node`, `bun` |
| `-t, --test-framework` | Testing framework | `vitest`, `jest` |
| `-m, --modules` | Additional modules | `billing-base`, `billing-stripe`, `iam-base`, `iam-better-auth` |
| `-D, --description` | Application description | _string_ |
| `-A, --author` | Application author | _string_ |
| `-L, --license` | License type | `apgl`, `gpl`, `lgpl`, `mozilla`, `apache`, `mit`, `boost`, `unlicense`, `none` |
| `-n, --dryrun` | Preview changes | None |

### Initialize Module

```bash
forklaunch init module [OPTIONS] [name]
```

| Option | Description | Values |
| :----- | :---------- | :------ |
| `-p, --path <base_path>` | Application path | _string_ |
| `-m, --module <module>` | Module to initialize | `billing-base`, `billing-stripe`, `iam-base`, `iam-better-auth` |
| `-d, --database <database>` | Database type | `postgresql`, `mysql`, `mariadb`, `mssql`, `mongodb`, `libsql`, `sqlite`, `better-sqlite` |
| `-n, --dryrun` | Dry run the command | None |

### Initialize Service
```bash
forklaunch init service [options]
```

| Option | Description | Values |
| :----- | :---------- | :----- |
| `-p, --path` | Application path | _string_ |
| `-d, --database` | Database type | `postgresql`, `mongodb` |
| `-D, --description` | Service description | _string_ |
| `-n, --dryrun` | Preview changes | None |

### Initialize Worker
```bash
forklaunch init worker [options]
```

| Option | Description | Values |
| :----- | :---------- | :----- |
| `-p, --path` | Application path | _string_ |
| `-b, --backend` | Backend type | `database`, `cache` |
| `-D, --description` | Worker description | _string_ |
| `-n, --dryrun` | Preview changes | None |

### Initialize Library
```bash
forklaunch init library [options]
```

| Option | Description | Values |
| :----- | :---------- | :----- |
| `-p, --path` | Application path | _string_ |
| `-D, --description` | Library description | _string_ |
| `-n, --dryrun` | Preview changes | None |

### Initialize Router
```bash
forklaunch init router [options]
```

| Option | Description | Values |
| :----- | :---------- | :----- |
| `-p, --path` | Service path (must be in service directory) | _string_ |
| `-n, --dryrun` | Preview changes | None |

## Examples

```bash
# Create a new application
forklaunch init application --database postgresql --validator zod --runtime node

# Add a module to existing application
forklaunch init module --path ./my-app --module billing-base

# Add a service to existing application
forklaunch init service --path ./my-app --database postgresql

# Add a worker with cache backend
forklaunch init worker --path ./my-app --backend cache

# Preview router creation
forklaunch init router --path ./my-app/services/api --dryrun
```

## Troubleshooting

**Error: "Directory already exists"**
- Choose a different name or remove existing directory
- Use `--dryrun` to preview changes before execution

**Error: "Invalid database type"**
- Check available database options in command help
- Ensure database is supported for the component type

**Error: "Path not found"**
- Verify the specified path exists
- For services/workers, ensure you're in an application directory

**Error: "Module not found"**
- Check available modules with `forklaunch init module --help`
- Verify module name spelling and availability

**Permission denied errors**
- Check file/directory permissions
- Ensure you have write access to the target directory

## Related Commands

- [`forklaunch add`](../adding-projects.md) - Add components to existing projects
- [`forklaunch depcheck`](./depcheck.md) - Check dependencies after initialization

## See Also

- [Adding Projects Guide](../adding-projects.md) - Comprehensive project creation guide
