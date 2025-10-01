---
title: Changing Workers
category: Changing Projects
description: Complete guide for modifying ForkLaunch worker types, queue systems, and processing configurations.
---

## Overview

The `forklaunch change worker` command allows you to modify existing worker configuration including worker types, queue systems, database connections, and metadata. This guide covers all available options and migration strategies.

<CodeTabs type="instantiate">
  <Tab title="Basic">

  ```bash
  forklaunch change worker
  ```

  </Tab>
  <Tab title="With Options">

  ```bash
  forklaunch change worker --path ./my-worker --type bullmq
  ```

  </Tab>
</CodeTabs>

## Command Options

| Option | Short | Description | Valid Values |
| :----- | :---- | :---------- | :----------- |
| `--path` | `-p` | The service path | Path to worker directory |
| `--name` | `-N` | The name of the service | Any valid worker name |
| `--type` | `-t` | The type to use | `database`, `redis`, `kafka`, `bullmq` |
| `--database` | `-d` | The database to use | See database options below |
| `--description` | `-D` | The description of the service | Any string |
| `--dryrun` | `-n` | Dry run the command | Flag (no value) |
| `--confirm` | `-c` | Flag to confirm any prompts | Flag (no value) |

## Worker Types

Available worker types:

- `database` - Database-driven worker for polling and processing
- `redis` - Redis-based pub/sub worker
- `kafka` - Apache Kafka consumer worker
- `bullmq` - Bull MQ queue worker with advanced features

## Database Options

For database workers:

- `postgresql` - PostgreSQL database
- `mysql` - MySQL database
- `mariadb` - MariaDB database
- `mssql` - Microsoft SQL Server
- `mongodb` - MongoDB database
- `libsql` - LibSQL (SQLite-compatible)
- `sqlite` - SQLite database
- `better-sqlite` - Better SQLite3

## Batch Changes

### Complete Worker Modernization

Upgrade worker type and add enhanced features:

```bash
forklaunch change worker \
  --path ./email-processor \
  --type bullmq \
  --description "High-performance email processing with BullMQ"
```

### Multiple Workers Migration

Update multiple workers to same configuration:

```bash
# Migrate all workers to BullMQ
forklaunch change worker --path ./email-processor --type bullmq
forklaunch change worker --path ./sms-processor --type bullmq
forklaunch change worker --path ./push-processor --type bullmq
```

## Migration Scenarios

### Scenario 1: Scale Up Processing

Migrate from simple database polling to high-performance queue:

```bash
# Phase 1: Migrate to Redis for better performance
forklaunch change worker --path ./batch-processor --type redis

# Phase 2: Upgrade to BullMQ for advanced features
forklaunch change worker --path ./batch-processor --type bullmq
```

### Scenario 2: Event-Driven Architecture

Migrate to Kafka for event-driven processing:

```bash
# Migrate analytics workers to Kafka
forklaunch change worker --path ./user-analytics --type kafka
forklaunch change worker --path ./order-analytics --type kafka
forklaunch change worker --path ./system-analytics --type kafka
```

### Scenario 3: Simplify Development

Use database workers for simpler local development:

```bash
# Simplify for development
forklaunch change worker --path ./email-processor --type database --database sqlite
```

## Troubleshooting

### Queue Connection Issues

**1. Redis Connection Problems**

```bash
# Test Redis connectivity
redis-cli ping

# Check Redis logs
docker logs redis-container
```

**2. Kafka Consumer Issues**

```bash
# Check consumer group status
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group order-processor

# Reset consumer offset
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --reset-offsets --group order-processor --topic order-events --to-earliest --execute
```

## Best Practices

### Worker Design Patterns

1. **Idempotent Processing**: Ensure jobs can be safely retried
2. **Error Handling**: Implement proper error recovery
3. **Progress Tracking**: Update job progress for long-running tasks
4. **Resource Management**: Properly close connections and clean up resources
5. **Monitoring**: Add logging and metrics for observability

### Performance Optimization

1. **Batch Processing**: Process multiple items together when possible
2. **Connection Pooling**: Use connection pools for database workers
3. **Concurrency Control**: Balance throughput with resource usage
4. **Queue Management**: Configure appropriate retention policies

### Testing Strategies

1. **Unit Tests**: Test individual worker methods
2. **Integration Tests**: Test with actual queue systems
3. **Load Tests**: Verify performance under load
4. **Error Scenarios**: Test failure and recovery paths

## Related Documentation

- **[Changing Services](./services.md)** - Service configuration changes
- **[Adding Workers](../adding-projects/workers.md)** - Creating new workers
- **[Framework Workers](../framework/workers.md)** - Worker framework documentation