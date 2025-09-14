---
title: Changing Libraries
category: Changing Projects
description: Complete guide for modifying ForkLaunch library configuration and metadata.
---

## Overview

The `forklaunch change library` command allows you to modify existing library configuration including library names and descriptions. This guide covers all available options and common scenarios.

<CodeTabs type="instantiate">
  <Tab title="Basic">

  ```bash
  forklaunch change library
  ```

  </Tab>
  <Tab title="With Options">

  ```bash
  forklaunch change library --path ./my-library --name new-name --description "New description"
  ```

  </Tab>
</CodeTabs>

## Command Options

| Option | Short | Description | Valid Values |
| :----- | :---- | :---------- | :----------- |
| `--path` | `-p` | The library path | Path to library directory |
| `--name` | `-N` | The name of the library | Any valid library name |
| `--description` | `-D` | The description of the library | Any string |
| `--dryrun` | `-n` | Dry run the command | Flag (no value) |
| `--confirm` | `-c` | Flag to confirm any prompts | Flag (no value) |

### Combined Changes

Update multiple options at once:

```bash
forklaunch change library \
  --path ./user-utils \
  --name account-utilities \
  --description "Comprehensive account management and user utility functions"
```

## Common Scenarios

### Scenario 1: Semantic Clarity

Rename libraries to better reflect their purpose:

```bash
# Improve naming for clarity
forklaunch change library --path ./utils --name validation-utils
forklaunch change library --path ./helpers --name data-helpers
forklaunch change library --path ./common --name shared-utilities
```

### Scenario 2: Domain Organization

Organize libraries by domain:

```bash
# Group related functionality
forklaunch change library --path ./user-utils --name auth-utilities
forklaunch change library --path ./payment-helpers --name billing-utilities
forklaunch change library --path ./analytics-tools --name reporting-utilities
```

### Scenario 3: Functional Grouping

Reorganize by functional responsibility:

```bash
# Group by function
forklaunch change library --path ./misc-utils --name validation-library
forklaunch change library --path ./tools --name formatting-library
forklaunch change library --path ./shared --name type-definitions
```

### Scenario 4: Version Organization

Prepare libraries for versioning:

```bash
# Add version context
forklaunch change library --path ./api-client --name api-client-v2
forklaunch change library --path ./core-utils --name core-utilities-stable
```

## Troubleshooting

### Import Resolution Issues

**Error**: TypeScript compilation errors after renaming

**Solution**:
<CodeTabs type="terminal">
<Tab title="pnpm">

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install

# Clear TypeScript cache
npx tsc --build --clean

# Rebuild all packages
pnpm run build

# Check for remaining references
grep -r "@myapp/old-library-name" .
```

  </Tab>
  <Tab title="bun">

```bash
# Clear node_modules and reinstall
rm -rf node_modules bun.lockb bun.lock
bun install

# Clear TypeScript cache
bunx tsc --build --clean

# Rebuild all packages
bun run build

# Check for remaining references
grep -r "@myapp/old-library-name" .
```

  </Tab>
</CodeTabs>

### Workspace Configuration Issues

**Error**: Library not found in workspace

**Solution**:
<CodeTabs type="terminal">
<Tab title="pnpm">

```bash
# Verify workspace configuration
cat package.json | grep -A 5 "workspaces"

# Reinstall workspace dependencies
pnpm install

# Check package resolution
pnpm ls @myapp/account-utilities
```

  </Tab>
  <Tab title="bun">

```bash
# Verify workspace configuration
cat package.json | grep -A 5 "workspaces"

# Reinstall workspace dependencies
bun install

# Check package resolution
bun pm ls @myapp/account-utilities
```

  </Tab>
</CodeTabs>

## Best Practices

### Library Design

1. **Single Responsibility**: Each library should have a focused purpose
2. **Clear Exports**: Provide clear, documented exports
3. **Type Safety**: Include comprehensive TypeScript types
4. **Tree-Shaking**: Support tree-shaking with named exports
5. **Documentation**: Include JSDoc comments and examples

### Naming Conventions

1. **Descriptive Names**: Use clear, descriptive library names

   ```bash
   # Good
   forklaunch change library --path ./utils --name validation-utilities

   # Avoid
   forklaunch change library --path ./utils --name lib1
   ```

2. **Consistent Patterns**: Follow consistent naming across libraries

   ```bash
   # Consistent pattern
   validation-utilities
   formatting-utilities
   data-utilities
   ```

3. **Namespace Consistency**: Maintain consistent package naming
   ```bash
   @myapp/validation-utilities
   @myapp/formatting-utilities
   @myapp/data-utilities
   ```

### Version Management

1. **Semantic Versioning**: Use semantic versioning for library changes
2. **Breaking Changes**: Document breaking changes clearly
3. **Backward Compatibility**: Maintain backward compatibility when possible

## Related Documentation

- **[Adding Libraries](../adding-projects/libraries.md)** - Creating new libraries
- **[Framework Libraries](../framework/libraries.md)** - Library framework documentation

- **[TypeScript Configuration](../configuration/typescript.md)** - TypeScript setup
- **[Workspace Management](../configuration/workspaces.md)** - Managing workspaces