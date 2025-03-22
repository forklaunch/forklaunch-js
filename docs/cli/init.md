---
title: CLI Reference - init
category: References
description: Learn how to use the forklaunch init command.
---

## Overview

The `init` command creates new resources for your application. For detailed information about project types, see [Adding Projects](/docs/adding-projects).

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
| `-s, --services` | Additional services | `billing`, `iam` |
| `-D, --description` | Application description | _string_ |
| `-A, --author` | Application author | _string_ |
| `-L, --license` | License type | `apgl`, `gpl`, `lgpl`, `mozilla`, `apache`, `mit`, `boost`, `unlicense`, `none` |
| `-n, --dryrun` | Preview changes | None |

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

# Add a service to existing application
forklaunch init service --path ./my-app --database postgresql

# Add a worker with cache backend
forklaunch init worker --path ./my-app --backend cache

# Preview router creation
forklaunch init router --path ./my-app/services/api --dryrun
```
