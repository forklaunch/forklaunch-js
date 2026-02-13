---
title: Getting Started
category: Guides
description: Learn how to get started with ForkLaunch.
---

# Introduction

## Welcome to Forklaunch!
Launch your apps faster with Forklaunch. 

Forklaunch provides the scaffolds you need to create your next application in TypeScript. From package.jsons to tsconfigs, we are here to help you launch faster and monitor your apps as you scale your user base.

# QuickStart

## Examples

- **[Dice Roll Tutorial](/docs/examples/dice-roll-node-app.md)** - Complete "Hello World" example: Build a dice roll API with database persistence and statistics

# Prerequisites

We're so glad you're here! Before you begin, make sure you have the following installed:

- **`Node.js`** (version 18 or higher)
- **`pnpm`** (version 8 or higher) or **`bun`** (version 1.22 or higher)
- **`Git`** (version 2.20 or higher)
- **`Docker`** (version 20.10 or higher)

# Installation

## Global Installation (Recommended)

`ForkLaunch` can be installed globally using `npm`, `pnpm`, or `bun`. Open your terminal and run one of the following commands:

<CodeTabs type="terminal">
  <Tab title="npm">

  ```bash
  npm install -g forklaunch
  ```

  </Tab>
  <Tab title="pnpm">

  ```bash
  pnpm install -g forklaunch
  ```

  </Tab>
  <Tab title="bun">

  ```bash
  bun install -g forklaunch
  ```

  </Tab>
</CodeTabs>

After installation, you can use `forklaunch` commands directly:

```bash
forklaunch init application my-app
```

## Local Development (Building from Source)

If you're working off the repository and building from source, use `cargo run --release --` from the `cli` directory:

```bash
cd cli
cargo build --release
cargo run --release -- init application my-app
```

**Note**: The `--` separates cargo arguments from forklaunch command arguments. This is only needed when running from source.

## Verification

To verify your installation:

```bash
# Check installed version
forklaunch version
```

## Create login

Once you have verified your installation, log in to your account to get started:
```bash
forklaunch login
```

# Next Steps

- **[Creating an Application](/docs/creating-an-application.md)** - Create your first application
- **[Adding Projects](/docs/adding-projects.md)** - Learn how to add services, workers, and libraries
- **[CLI Reference](/docs/cli.md)** - Complete command reference

