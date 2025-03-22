---
title: CLI Reference - depcheck
category: References
description: Learn how to use the forklaunch depcheck command.
---

## Overview

The `depcheck` command ensures dependency consistency across your application's projects by checking for version mismatches based on defined project groups.

## Usage

```bash
forklaunch depcheck
```

## Configuration

Dependency checks are configured in `./forklaunch/manifest.toml` using project groups.

### Default Behavior

By default, all projects are checked against each other:

```toml
[project_peer_topology]
myapp = [
    "A",
    "B",
    "C",
]
```

### Custom Groups

To check only specific project combinations, define separate groups:

```toml
[project-peer-topologies]
# A and B will be checked against each other
frontend_group = [
    "A",
    "B",
]

# C will only be checked against itself
backend_group = [
    "C",
]
```

### Example Scenarios

1. **Microservices**: Group services that share common dependencies
```toml
[project-peer-topologies]
auth_services = ["auth-api", "user-api"]
data_services = ["analytics-api", "reporting-api"]
```

2. **Frontend/Backend Split**: Separate frontend and backend dependency checks
```toml
[project-peer-topologies]
frontend = ["web-app", "mobile-app"]
backend = ["api-server", "worker"]
```

### Best Practices

- Group projects that should share identical dependency versions
- Keep critical infrastructure services in separate groups
- Use meaningful group names that reflect project relationships
