---
title: Changing Applications
category: Changing Projects
description: Complete guide for modifying ForkLaunch application configuration, runtimes, and frameworks.
---

## Overview

The `forklaunch change application` command allows you to modify existing application configuration including runtimes, frameworks, and metadata. This guide covers all available options and common scenarios.

<CodeTabs type="instantiate">
  <Tab title="Basic">

  ```bash
  forklaunch change application
  ```

  </Tab>
  <Tab title="With Options">

  ```bash
  forklaunch change application --runtime bun --http-framework hyper-express
  ```

  </Tab>
</CodeTabs>

## Command Options

| Option | Short | Description | Valid Values |
| :----- | :---- | :---------- | :----------- |
| `--path` | `-p` | The application root path | Path to application directory |
| `--name` | `-N` | The name of the application | Any valid application name |
| `--validator` | `-v` | The validator to use | `zod`, `typebox` |
| `--formatter` | `-f` | The formatter to use | `prettier`, `biome` |
| `--linter` | `-l` | The linter to use | `eslint`, `oxlint` |
| `--http-framework` | `-F` | The http framework to use | `express`, `hyper-express` |
| `--runtime` | `-r` | The runtime to use | `node`, `bun` |
| `--test-framework` | `-t` | The test framework to use | `vitest`, `jest` |
| `--description` | `-D` | The description of the application | Any string |
| `--author` | `-A` | The author of the application | Any string |
| `--license` | `-L` | The license of the application | `AGPL-3.0`, `GPL-3.0`, `LGPL-3.0`, `Apache-2.0`, `MIT`, `Mozilla-2.0`, `Boost-1.0`, `Unlicense`, `none` |
| `--dryrun` | `-n` | Dry run the command | Flag (no value) |
| `--confirm` | `-c` | Flag to confirm any prompts | Flag (no value) |

## Batch Changes

### Complete Stack Modernization

Update multiple tools at once:

```bash
forklaunch change application \
  --path ./my-app \
  --runtime bun \
  --http-framework hyper-express \
  --validator typebox \
  --formatter biome \
  --linter oxlint \
  --test-framework vitest
```

## Preview Changes

Always preview major changes first:

```bash
# Preview runtime change
forklaunch change application --path ./my-app --runtime bun --dryrun

# Preview complete modernization
forklaunch change application \
  --path ./my-app \
  --runtime bun \
  --formatter biome \
  --linter oxlint \
  --dryrun
```

## Common Scenarios

### Scenario 1: Performance Optimization

Optimize for development and runtime performance:

```bash
# Step 1: Switch to Bun
forklaunch change application --path ./my-app --runtime bun

# Step 2: Switch to TypeBox
forklaunch change application --path ./my-app --validator typebox

# Step 3: Update development tools
forklaunch change application \
  --path ./my-app \
  --formatter biome \
  --linter oxlint \
```

### Scenario 2: Team Standardization

Align with team preferences:

```bash
# Standardize on specific tools
forklaunch change application \
  --path ./my-app \
  --formatter prettier \
  --linter eslint \
  --test-framework jest
```

### Scenario 3: Migration from Legacy

Migrate from older toolchain:

```bash
# Modern JavaScript toolchain
forklaunch change application \
  --path ./my-app \
  --runtime bun \
  --formatter biome \
  --linter oxlint
```

## Troubleshooting

### Common Issues

**1. Dependency Conflicts**
<CodeTabs type="terminal">
<Tab title="pnpm">

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
pnpm install
```

  </Tab>
  <Tab title="bun">

```bash
# Clear and reinstall
rm -rf node_modules bun.lockb bun.lock
bun install
```

  </Tab>
</CodeTabs>

**2. Configuration Errors**
<CodeTabs type="terminal">
<Tab title="pnpm">

```bash
# Check configuration
pnpm run lint
pnpm run build
```

  </Tab>
  <Tab title="bun">

```bash
# Check configuration
bun run lint
bun run build
```

  </Tab>
</CodeTabs>

**3. Runtime Compatibility**
<CodeTabs type="terminal">
<Tab title="pnpm">

```bash
# Test new runtime
pnpm run dev
pnpm test
```

  </Tab>
  <Tab title="bun">

```bash
# Test new runtime
bun run dev
bun test
```

  </Tab>
</CodeTabs>

**4. Import Resolution Issues**
<CodeTabs type="terminal">
<Tab title="pnpm">

```bash
# Check imports after framework changes
pnpm run build
```

  </Tab>
  <Tab title="bun">

```bash
# Check imports after framework changes
bun run build
```

  </Tab>
</CodeTabs>

### Validation Steps

After making changes, always:

| Step                     | pnpm             | bun             |
| :----------------------- | :--------------- | :-------------- |
| **Install dependencies** | `pnpm install`   | `bun install`   |
| **Run linter**           | `pnpm run lint`  | `bun run lint`  |
| **Run tests**            | `pnpm test`      | `bun test`      |
| **Build project**        | `pnpm run build` | `bun run build` |
| **Start development**    | `pnpm run dev`   | `bun run dev`   |

### Rollback Strategy

If issues occur:

<CodeTabs type="terminal">
  <Tab title="pnpm">

```bash
# Quick rollback
git checkout -- .
pnpm install

# Or revert specific commit
git revert HEAD
```

  </Tab>
  <Tab title="bun">

```bash
# Quick rollback
git checkout -- .
bun install

# Or revert specific commit
git revert HEAD
```

  </Tab>
</CodeTabs>

## Integration with Other Commands

### Dependency Check

After changes, verify alignment:

```bash
forklaunch change application --runtime bun
forklaunch depcheck
```

### Adding New Components

New components will use updated configuration:

```bash
forklaunch change application --validator typebox
forklaunch add service user-service  # Will use TypeBox
```

## Best Practices

1. **One change at a time**: Make incremental changes
2. **Test thoroughly**: Run full test suite after each change
3. **Version control**: Commit before and after changes
4. **Document changes**: Update README and documentation
5. **Team coordination**: Inform team of toolchain changes
6. **Environment consistency**: Apply same changes to all environments

## Related Documentation

- **[Changing Services](./services.md)** - Service-specific changes
- **[CLI Reference](../cli/change.md)** - Complete CLI reference