---
title: Adding Services and Workers
category: Guides
description: Learn how to add services and workers to your ForkLaunch application.
---

# Overview

**Projects** are the building blocks of your ForkLaunch application. They represent different types of components that work together to form a complete system. Each project type serves a specific purpose and can be added to your application using the `forklaunch init` command.

## Quickstart

### Modules
Preconfigured, production-ready services that provide common functionality:

```bash
# Interactive mode
forklaunch init module

# Add billing module
forklaunch init module billing --module billing-stripe --database postgresql

# Add IAM module
forklaunch init module auth --module iam-base --database postgresql
forklaunch init module auth --module iam-better-auth --database postgresql
```

### Services
Self-contained API services that handle specific business domains:

```bash
# Basic service
forklaunch init service users --database postgresql

# Service with Redis cache
forklaunch init service products --database postgresql --infrastructure redis

# Service with multiple infrastructure
forklaunch init service files --database postgresql --infrastructure redis s3
```

### Workers
Background processes for asynchronous job processing:

```bash
# Database worker
forklaunch init worker email-processor --type database --database postgresql

# Redis worker
forklaunch init worker notification-worker --type redis

# BullMQ worker
forklaunch init worker scheduled-jobs --type bullmq

# Kafka worker
forklaunch init worker analytics-consumer --type kafka
```

### Libraries
Shared code and utilities used across services and workers:

```bash
# Basic library
forklaunch init library utils

# Library with description
forklaunch init library validation --description "Input validation utilities"
```

### Routers
Add new routes and controllers to existing services:

```bash
# Basic router
forklaunch init router products

# Router with infrastructure
forklaunch init router orders --path ./commerce-service --infrastructure redis
```

### Definitions

| Concept | Definition | What It Does | Common Examples |
|----------|-------------|---------------|------------------|
| **Service** | A **self-contained part of your application** that handles a specific kind of task or related features. | It runs continuously (like an API) and responds to requests — from users, other services, or front-end apps. | - An **API service** that handles user logins and profiles.<br>- A **billing service** that manages payments.<br>- A **data ingestion service** that collects and processes data. |
| **Worker** | A **background process** that runs tasks **asynchronously**, not directly responding to user requests. | It takes jobs from a queue or schedule, performs work, and reports results or stores data — often handling heavier or delayed work. | - Sending emails after a signup.<br>- Generating daily reports.<br>- Processing large datasets.<br>- Cleaning up logs or cache files. |
| **Library** | A **shared collection of code**, utilities, or models used across services and workers. | Provides reusable logic (like validation, database models, or helper functions) that multiple parts of the system can import. | - **Core library** with shared models and validation schemas.<br>- **Auth library** with JWT and session utilities.<br>- **Utils library** for formatting, logging, or constants. |
| **Modules** | 



## Next Steps

Learn more about each project type:
- [Modules](/docs/adding-projects/modules.md)
- [Services](/docs/adding-projects/services.md)
- [Workers](/docs/adding-projects/workers.md)
- [Libraries](/docs/adding-projects/libraries.md)
- [Routers](/docs/adding-projects/routers.md)
