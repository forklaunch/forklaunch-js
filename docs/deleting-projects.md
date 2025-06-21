---
title: Deleting Projects
category: Guide
description: Guide for safely deleting ForkLaunch project components.
---

## Deleting Projects

The ForkLaunch CLI provides commands to delete project components such as services, workers, routers, and libraries. These operations are **irreversible** and require confirmation to prevent accidental data loss.

> **For detailed CLI syntax and options, see**:  
> [Delete Command Reference](/docs/cli/delete.md)

---

## Basic Usage

```bash
forklaunch delete <component> <name> [OPTIONS]
# or
forklaunch del <component> <name> [OPTIONS]
```

### Available Components

| Component   | Command                            | Description                                 |
| :---------- | :--------------------------------- | :------------------------------------------ |
| **Service** | `forklaunch delete service <name>` | Delete a service and its dependencies       |
| **Worker**  | `forklaunch delete worker <name>`  | Delete a worker and its queue configuration |
| **Router**  | `forklaunch delete router <name>`  | Delete a router and its route definitions   |
| **Library** | `forklaunch delete library <name>` | Delete a library and its exports            |

## Safety Features

### Confirmation Required

All delete operations require explicit confirmation unless bypassed:

```bash
# Interactive confirmation (default)
forklaunch delete service payments
# → "Are you sure you want to delete 'payments'? This action is irreversible. (y/N)"

# Skip confirmation
forklaunch delete service payments --continue
```

## Common Scenarios

### Cleanup After Refactoring

When consolidating functionality:

```bash
# Remove old service after migrating to new one
forklaunch delete service legacy-payments --continue

# Remove split workers after combining them
forklaunch delete worker email-processor
forklaunch delete worker sms-processor
```

### Removing Experimental Features

Clean up proof-of-concept components:

```bash
# Remove experimental features
forklaunch delete service experimental-ai
forklaunch delete router beta-api
forklaunch delete library prototype-utils
```

### Architecture Simplification

Remove unnecessary layers:

```bash
# Remove redundant routers
forklaunch delete router admin-v1  # keeping admin-v2
forklaunch delete router internal   # moving routes to main router

# Remove unused libraries
forklaunch delete library old-validation  # using new validation service
```

## Best Practices

### Pre-Deletion Checklist

1. **Review Dependencies**

   ```bash
   # Check what uses this component
   grep -r "import.*from.*billing" services/
   grep -r "billing" *.ts *.js
   ```

2. **Backup Important Code**

   ```bash
   # Copy useful logic before deletion
   cp services/billing/business-logic.ts ~/backups/
   ```

3. **Update Documentation**

   - Remove component from README
   - Update API documentation
   - Clean up architecture diagrams

4. **Run Tests**
   ```bash
   # Ensure tests pass before deletion
   npm test
   ```

### Safe Deletion Process

1. **Identify Dependencies**

   ```bash
   # Search for imports
   grep -r "from.*component-name" .
   grep -r "import.*component-name" .
   ```

2. **Update Dependents First**

   - Remove or replace imports
   - Update business logic
   - Fix broken tests

3. **Delete Component**

   ```bash
   forklaunch delete <component> <name>
   ```

4. **Verify Cleanup**
   ```bash
   # Check for broken imports
   npm run build
   npm test
   ```

### Batch Operations

For multiple deletions:

```bash
# Delete related components together
forklaunch delete service old-billing --continue
forklaunch delete worker billing-processor --continue
forklaunch delete router billing-api --continue
forklaunch delete library billing-utils --continue
```

---

## Error Recovery

### Accidental Deletion

If you accidentally delete a component:

1. **Restore from Git**

   ```bash
   git checkout HEAD -- services/deleted-service/
   git checkout HEAD -- registrations.ts
   ```

2. **Regenerate if Needed**

   ```bash
   # Recreate the component
   forklaunch add service restored-service --database postgresql
   ```

3. **Fix Imports**
   - Restore import statements
   - Update registrations
   - Run tests to verify

### Partial Deletion Issues

If deletion fails partway through:

1. **Check File System**

   ```bash
   # Look for leftover files
   find . -name "*deleted-component*"
   ```

2. **Clean Registration Files**

   - Remove orphaned imports
   - Clean up registrations.ts
   - Update index.ts files

3. **Rebuild Project**
   ```bash
   npm run build
   npm test
   ```

## Related Documentation

- [Adding Projects](/docs/adding-projects.md) - Create new components
- [Changing Projects](/docs/changing-projects.md) - Modify existing components
- [CLI Reference](/docs/cli.md) - All CLI commands
- [Best Practices](/docs/best-practices.md) - Development best practices
- [Troubleshooting](/docs/troubleshooting.md) - Common issues and solutions

## Security Considerations

- **Irreversible Operations**: All deletions are permanent
- **Confirmation Required**: Interactive prompts prevent accidents
- **Git Integration**: Use version control for safety
- **Backup Strategy**: Always backup important code before deletion
- **Team Communication**: Coordinate deletions in team environments
