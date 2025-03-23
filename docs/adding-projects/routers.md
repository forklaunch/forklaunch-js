---
title: Adding Projects - Routers
category: Guides
description: Learn how to add and configure routers in your application.
---

## Adding a Router

After you have added a service/worker, you can add a router to it by running the following command:

<CodeTabs type="instantiate">
  <Tab title="init">

  ```bash
  forklaunch init library
  ```

  </Tab>
  <Tab title="add">

  ```bash
  forklaunch add library
  ```
  
  </Tab>
</CodeTabs>

This adds a new router to your application, with a `RCSIDES` (`route`, `controller`, `service`, `interface`, `dtoMapper`, `entity`, `seeder`) stack, only.

You will not need to run any new scripts.

### Project Structure

A minimal router will add the following files to your service/worker:

```bash
.
├── constants
│   └── seed.data.ts # seed data for new entity types
├── controllers
│   └── newRouter.controller.ts # the controller for the router, defining the API handlers
├── interfaces
│   └── newRouter.interface.ts # the interface for the router, defining the business logic contract
├── middleware
├── models
│   ├── dtoMapper
│   │   └── newRouter.dtoMapper.ts # the data transfer object mapper for mapping between DTOs and entities
│   ├── persistence
│   │   ├── index.ts
│   │   └── newRouterRecord.entity.ts # the entity for the router, defining the database schema
│   ├── seeder.ts # boilerplate for running a seeder
│   └── seeders
│       ├── index.ts
│       └── newRouterRecord.seeder.ts # the seeder for the specific entity (boilerplate)
├── routes
│   └── newRouter.routes.ts # the routes definition for the router
└── services
    └── newRouter.service.ts # the business logic for the router
```

Additionally, the router will edit the following files in the service:
- `bootstrapper.ts`: Adds dependency injection configuration
- `server.ts`/`worker.ts`: Registers the router with the application

### Next Steps

After adding a router:
1. Define your data model in the entity file
2. Implement your business logic in the service
3. Set up your API endpoints in the routes file
4. Add test data using the seeder
5. Write tests for your implementation

### Common Issues

1. **Route Conflicts**: Ensure your route paths don't conflict with existing routes
2. **Middleware Order**: Check that middleware is registered in the correct order
3. **Dependency Injection**: Verify all dependencies are properly registered in bootstrapper.ts

### Best Practices

1. Keep routes organized by resource or domain
2. Use consistent naming conventions for endpoints
3. Implement proper request validation
4. Write comprehensive tests for all endpoints
5. Use DtoMappers to control data flow between layers
6. Keep controller logic thin, delegating to services
