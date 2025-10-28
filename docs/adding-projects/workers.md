---
title: Adding Projects - Workers
category: Guides
description: Learn how to add and configure workers in your application.
---

## Adding a Worker

To add a worker to your application, run the following command:

<CodeTabs type="instantiate">
  <Tab title="init">

  ```bash
  forklaunch init worker
  ```

  </Tab>
  <Tab title="add">

  ```bash
  forklaunch add worker
  ```
  
  </Tab>
</CodeTabs>

This adds a new worker that has a `worker` and `server` entry point. The worker handles asynchronous job processing, and the server provides health checks and optionally exposes management APIs.

`ForkLaunch` will automatically add the worker to your workspace, docker-compose, and register any necessary scripts.

By default, you will not need to run any scripts to get going, but if you have added a new backend, you may need to run `build` and `install` scripts from the top level of the application.

### Command Options

| Option | Short | Description | Valid Values |
| :----- | :---- | :---------- | :----------- |
| `--type` | `-t` | The worker type to use | `database`, `redis`, `kafka`, `bullmq` |
| `--database` | `-d` | The database to use (for database workers) | `postgresql`, `mysql`, `mariadb`, `mssql`, `mongodb`, `libsql`, `sqlite`, `better-sqlite` |
| `--path` | `-p` | The application path to initialize the worker in | Any valid directory path |
| `--description` | `-D` | The description of the worker | Any string |
| `--dryrun` | `-n` | Dry run the command | Flag (no value) |

### Worker Aliases

The `worker` command has an alias for convenience:
- `wrk`

### Worker Types

ForkLaunch supports multiple worker implementations, each optimized for different use cases:

#### Database Worker (`--type database`)
- **Use Case**: Persistent job processing with full ACID guarantees
- **Features**: Database-backed job queue, complex job relationships, full audit trail
- **Best For**: Critical jobs that need durability, complex workflows, financial transactions

#### Redis Worker (`--type redis`) 
- **Use Case**: High-performance, lightweight job processing
- **Features**: In-memory job processing, fast throughput, simple pub/sub
- **Best For**: Real-time notifications, cache invalidation, simple background tasks

#### BullMQ Worker (`--type bullmq`)
- **Use Case**: Redis-based job queue with advanced features
- **Features**: Job scheduling, retry logic, job prioritization, dashboard UI
- **Best For**: Scheduled tasks, email processing, complex retry scenarios

#### Kafka Worker (`--type kafka`)
- **Use Case**: Event streaming and distributed event processing  
- **Features**: Event streaming, topic-based routing, consumer groups
- **Best For**: Event sourcing, microservice communication, analytics pipelines

### Project Structure

A worker follows the standard ForkLaunch service structure:

```bash
.
├── registrations.ts # the dependency injector/configuration loader
├── client.ts # the client for the worker, defining the event handlers
├── constants
│   └── seed.data.ts # seed data for new entity types (only relevant for database workers)
├── controllers
│   └── newWorker.controller.ts # the controller for the worker, defining the API handlers
├── eslint.config.mjs -> ../eslint.config.mjs # symlinked from parent for consistency
├── interfaces
│   └── newWorker.interface.ts
├── mikro-orm.config.ts
├── models
│   ├── mappers
│   │   └── newWorker.mappers.ts
│   ├── persistence
│   │   ├── index.ts
│   │   └── newWorkerRecord.entity.ts
│   ├── seeder.ts
│   └── seeders
│       ├── index.ts
│       └── newWorkerRecord.seeder.ts
├── package.json
├── routes
│   └── newWorker.routes.ts
├── services
│   └── newWorker.service.ts
├── tsconfig.json
├── vitest.config.ts -> ../vitest.config.ts
└── server.ts
```

### Usage Examples

```bash
# Basic database worker
forklaunch init worker email-processor --type database --database postgresql

# Redis worker for real-time tasks
forklaunch init worker notification-worker --type redis

# BullMQ worker with advanced features
forklaunch init worker scheduled-jobs --type bullmq

# Kafka worker for event streaming
forklaunch init worker analytics-consumer --type kafka

# Custom path and description
forklaunch init worker background-tasks --path ./workers --description "Background task processor"
```

### Next Steps

After creating a worker:
1. Define your event handlers in the client
2. Implement your worker logic in the worker file
3. Set up any necessary data models (for database workers)
4. Configure event processing patterns
5. Add error handling and retries
6. Write tests for your implementation

### Common Issues

1. **Backend Connection**: Ensure backend services (Redis, Kafka, DB) are running and accessible
2. **Environment Variables**: Verify all required variables are set correctly
3. **Concurrency**: Configure appropriate concurrency limits for your worker type
4. **Memory Management**: Monitor for memory leaks in long-running job processing
5. **Error Handling**: Implement proper retry logic and dead letter queues
6. **Scaling**: Configure worker scaling based on job queue length

### Deployment Defaults

When you deploy a worker using `forklaunch deploy`, the platform automatically provisions resources using **AWS Free Tier** defaults to minimize costs:

#### Compute (Per Worker)
- **CPU**: 256m (0.25 vCPU) - Fargate free tier eligible
- **Memory**: 512Mi (0.5 GB) - Fargate free tier eligible
- **Replicas**: 1 minimum, 2 maximum - Auto-scaling based on queue depth
- **Concurrency**: 5 concurrent jobs per worker instance

#### Queue Backend (By Worker Type)

**Database Workers**:
- Uses same database as application (see service defaults)
- Job table with indexing
- Polling interval: 5 seconds

**Redis Workers**:
- **Instance**: cache.t3.micro (free tier eligible)
- **Connection Pool**: 10 connections
- **Persistence**: RDB snapshots (1 day retention)

**BullMQ Workers**:
- Uses Redis (same as Redis workers above)
- **Job Retention**: 24 hours for completed jobs
- **Failed Job Retention**: 7 days
- **Rate Limiting**: 100 jobs/minute per worker

**Kafka Workers**:
- **Not in free tier** - minimum cost ~$70/month
- Consider Redis or Database workers for free tier deployments
- Recommended for production event streaming only

#### Storage
- **Dead Letter Queue**: Automatic for failed jobs
- **Job Logs**: 7 day retention in CloudWatch
- **Metrics**: Job duration, success rate, queue depth

**Note**: You can upgrade these defaults via the Platform UI when your application grows. The free tier defaults are designed to keep costs at $0/month for development and small production workloads.

**Cost Estimate**:
- Database/Redis/BullMQ Workers: $0/month (within free tier)
- Kafka Workers: $70+/month (not free tier eligible)
- Can scale up via Platform UI as needed

**Recommendation**: Start with Database or BullMQ workers for free tier deployments. Migrate to Kafka only when you need high-throughput event streaming.

### Best Practices

1. **Choose the Right Type**: Select worker type based on durability and performance needs
2. **Free Tier First**: Use Database or BullMQ workers to stay in free tier
3. **Idempotent Processing**: Ensure jobs can be safely retried
4. **Error Handling**: Implement comprehensive error handling and logging
5. **Monitoring**: Track job success/failure rates and processing times
6. **Graceful Shutdown**: Handle shutdown signals properly to avoid job loss
7. **Resource Management**: Set appropriate timeouts and concurrency limits
8. **Testing**: Test with realistic job volumes and failure scenarios
9. **Documentation**: Document job types and expected data structures
10. **Scale Smart**: Monitor costs via Platform UI before upgrading resources
