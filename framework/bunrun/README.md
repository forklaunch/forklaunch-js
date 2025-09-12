# @forklaunch/bunrun

A Bun-native TypeScript workspace script runner with topological ordering.

## Installation

```bash
npm install -g @forklaunch/bunrun
# or
bun add -g @forklaunch/bunrun
```

**Requirements:** Bun >= 1.1.0

## Usage

```bash
# Run build script in topological order
bunrun build

# Run with specific script
bunrun test

# Run with concurrency limit
bunrun build --jobs 4

# Run sequentially (one at a time)
bunrun build --sequential

# Filter packages
bunrun build --filter "@myorg/*"
bunrun build --exclude "**/legacy-*"

# Debug mode
bunrun build --debug

# Print plan without executing
bunrun build --print-only
```

## Features

- **Topological ordering**: Runs scripts in dependency order
- **Parallel execution**: Runs independent packages concurrently
- **Workspace discovery**: Automatically finds packages in monorepos
- **Flexible filtering**: Include/exclude packages by name or path
- **Dependency-aware**: Considers dependencies, devDependencies, and peerDependencies
- **Bun-native**: Direct TypeScript execution without compilation

## Options

- `script` - Script to run (default: build)
- `-j, --jobs <n>` - Concurrency per tier (default: CPU count)
- `--sequential` - Run strictly one-by-one in topological order
- `--filter <glob>` - Include packages matching glob pattern (can repeat)
- `--exclude <glob>` - Exclude packages matching glob pattern (can repeat)
- `--no-dev` - Ignore devDependencies for ordering
- `--no-peer` - Ignore peerDependencies for ordering
- `--print-only` - Print execution plan without running
- `--debug` - Show diagnostic information

## Examples

```bash
# Build all packages in dependency order
bunrun build

# Run tests with limited concurrency
bunrun test --jobs 2

# Build only frontend packages
bunrun build --filter "**/frontend-*"

# Build everything except legacy packages
bunrun build --exclude "**/legacy-*"

# Sequential build for debugging
bunrun build --sequential --debug
```

## License

MIT
