# Contributing to ForkLaunch

Thank you for your interest in contributing to ForkLaunch! We welcome contributions from the community and appreciate your help in making our products better.

## Our Products

ForkLaunch consists of three main products, each with its own license and development process:

### 1. CLI (AGPL License)
- Command-line interface for ForkLaunch
- Located in `cli/` directory
- Enhanced security review process
- By contributing, you agree to license your code under AGPL

### 2. Framework (MIT License)
- Core framework functionality
- Located in `framework/` directory
- More flexible contribution process
- Focus on backwards compatibility

### 3. Packages (MIT License)
- Utility packages and extensions
- Located in `packages/` directory
- Rapid development cycle
- Emphasis on documentation

## Getting Started

### CLI Development (Rust)
1. Install Rust via [rustup](https://rustup.rs/)
2. Navigate to `cli/` directory
3. Run `cargo build`
4. Run tests with `cargo test`
5. Run E2E tests with scripts in `test/xxxxxx.sh`

### Framework & Packages Development (TypeScript)
1. Install dependencies: `pnpm install`
2. Build all packages: `pnpm build`
3. Run tests: `pnpm test`

All npm scripts for the Framework and Packages are available in the root `package.json`. The CLI has its own Rust-specific tooling in the `cli/` directory.

## Development Workflow

### CLI Development
1. Review security guidelines in `cli/SECURITY.md`
2. Make changes in `cli/` directory
3. Format code: `cargo fmt`
4. Run clippy: `cargo clippy`
5. Test: `cargo test`

### Framework & Packages Development
1. Make your changes
2. Format and lint: `pnpm format && pnpm lint`
3. Run tests: `pnpm test`
4. For specific package testing: `pnpm test --filter @forklaunch/package-name`

## Development Process

Before any development, review security guidelines in `cli/SECURITY.md`

### CLI Development
1. Run CLI-specific tests: `pnpm test:cli`
2. Ensure documentation is updated
3. Security review required

### Framework Development
1. Write or update tests
2. Run framework tests: `pnpm test:framework`
3. Check backwards compatibility
4. Update migration guides if needed

### Packages Development
1. Run package-specific tests: `pnpm test:packages`
2. Update package documentation
3. Verify integration tests

## Common Requirements
- Format your code: `pnpm format`
- Check for linting errors: `pnpm lint`
- Commit using [conventional commits](https://www.conventionalcommits.org/)
- Open a Pull Request

## Pull Request Guidelines

- Clearly indicate which product you're contributing to in the PR title
- Describe the changes you've made and why
- Reference any related issues
- Ensure all tests pass and there are no linting errors
- Keep changes focused and atomic - one feature/fix per PR

## Code Style

- We use TypeScript for type safety
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Write unit tests for new functionality

## Working with Packages

This is a monorepo managed with pnpm workspaces. The main packages are:

- `@forklaunch/core` - Core functionality and types
- `@forklaunch/universal-sdk` - Universal SDK for API integration
- `@forklaunch/validator` - Schema validation utilities

## Getting Help

- Open an issue for bugs or feature requests
- Join our [Discord community](https://discord.gg/forklaunch) for questions
- Check the [documentation](https://docs.forklaunch.com)

## License Acknowledgment

By contributing to ForkLaunch products, you acknowledge and agree that:
- CLI contributions will be licensed under AGPL
- Framework and Packages contributions will be licensed under MIT

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
