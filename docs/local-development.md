---
title: Local Development
category: Guides
description: Learn how to run your ForkLaunch application locally.
---

## Prerequisites

This section assumes you have generated a new `ForkLaunch` application with at least one service or worker. If you have not, please see the [Getting Started](/docs/getting-started) guide.

## Initial Setup

Run these commands to set up your development environment:

<CodeTabs type="terminal">
  <Tab title="pnpm">
    ```bash
    # Install dependencies
    pnpm install

    # Build the application
    pnpm build

    # Set up database and initial migrations
    forklaunch database:setup
    ```
  </Tab>
  <Tab title="bun">
    ```bash
    # Install dependencies
    bun install

    # Build the application
    bun run build

    # Set up database and initial migrations
    forklaunch database:setup
    ```
  </Tab>
</CodeTabs>

## Development Mode

Run the application with hot reloading enabled:

<CodeTabs type="terminal">
  <Tab title="pnpm">
    ```bash
    pnpm dev
    ```
  </Tab>
  <Tab title="bun">
    ```bash
    bun dev
    ```
  </Tab>
</CodeTabs>

## Production Mode

Run the application in production mode:

<CodeTabs type="terminal">
  <Tab title="pnpm">
    ```bash
    pnpm start
    ```
  </Tab>
  <Tab title="bun">
    ```bash
    bun start
    ```
  </Tab>
</CodeTabs>

## Troubleshooting

When adding new services or workers, you might encounter initial setup errors. If this happens, try these steps in order:

<CodeTabs type="terminal">
  <Tab title="pnpm">
    ```bash
    # Create and run new migrations
    pnpm migrate:init/create
    # If errors persist, rebuild the development environment
    pnpm dev:build
    ```
  </Tab>
  <Tab title="bun">
    ```bash
    # Create and run new migrations
    bun migrate:init/create
    # If errors persist, rebuild the development environment
    bun dev:build
    ```
  </Tab>
</CodeTabs>

ForkLaunch is designed to be modular, allowing you to add new components incrementally without breaking existing functionality. These commands help ensure new components are properly integrated into your application.
