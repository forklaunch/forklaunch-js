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

This adds a new worker that has a `worker` and `client` entry point. The `client` handles the production of events, and the `worker` handles the consumption of events.

`ForkLaunch` will automatically add both the worker and client to your workspace, docker-compose, and register any necessary scripts.

By default, you will not need to run any scripts to get going, but if you have added a net new backend, you may need to run `build` and `install` scripts from the top level of the application.

### Choices

| Component | Valid Options       | Description                                                                                                                | How to Change                                                        |
| :-------- | :------------------ | :------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| _Backend_ | `cache`, `database` | The backend to use for your worker. By default, the database worker will use `postgresql`, and the cache will use `redis`. | Not trivial. It may be easier to add a new worker with the new type. |

### Project Structure

A minimal worker will have the following structure:

```bash
.
├── bootstrapper.ts # the dependency injector/configuration loader
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
│   ├── dtoMapper
│   │   └── newWorker.dtoMapper.ts
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
└── worker.ts
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

1. **Backend Connection**: Ensure your backend credentials are correct
2. **Event Processing**: Check that events are being properly acknowledged
3. **Concurrent Processing**: Verify worker instances aren't competing for the same events
4. **Memory Management**: Monitor for memory leaks in long-running workers
5. **Dead Letter Queues**: Set up proper handling for failed events

### Best Practices

1. Keep workers focused on a single responsibility
2. Implement proper error handling and retries
3. Use dead letter queues for failed events
4. Monitor worker performance and health
5. Handle graceful shutdowns
6. Implement idempotent processing
7. Use transactions when necessary (database workers)
