---
title: Adding Projects - Services
category: Guides
description: Learn how to add and configure services in your application.
---

## Adding a Service

To add a service to your application, run the following command:

<CodeTabs type="instantiate">
  <Tab title="init">

  ```bash
  forklaunch init service
  ```

  </Tab>
  <Tab title="add">

  ```bash
  forklaunch add service
  ```

  </Tab>
</CodeTabs>

This adds a new service to your application, with a `RCSIDES` (`route`, `controller`, `service`, `interface`, `mappers`, `entity`, `seeder`) stack, along with other configuration needed for the service to run standalone.

`ForkLaunch` will automatically add the project to your workspace, docker-compose, and register any necessary scripts.

By default, you will not need to run any scripts to get going, but if you have added a new database, you may need to run `build` and `install` scripts from the top level of the application.

### Choices

| Component  | Valid Options           | Description                           | How to Change                                                |
| :--------- | :---------------------- | :------------------------------------ | :----------------------------------------------------------- |
| _Database_ | `postgresql`, `mongodb` | The database to use for your service. | Edit entity import paths and change the database import path |

### Project Structure

A minimal service will have the following structure:

```bash
.
├── registrations.ts # the dependency injector/configuration loader
├── constants
│   └── seed.data.ts # seed data for new entity types
├── controllers
│   └── newService.controller.ts # the controller for the service, defining the API handlers
├── eslint.config.mjs -> ../eslint.config.mjs # symlinked from parent for consistency
├── interfaces
│   └── newService.interface.ts # the interface for the service, defining the business logic contract
├── mikro-orm.config.ts # the configuration for the database
├── models
│   ├── mappers
│   │   └── newService.mappers.ts # the data transfer object mapper for mapping between DTOs and entities
│   ├── persistence
│   │   ├── index.ts
│   │   └── newServiceRecord.entity.ts # the entity for the service, defining the database schema
│   ├── seeder.ts # boilerplate for running a seeder
│   └── seeders
│       ├── index.ts
│       └── newServiceRecord.seeder.ts # the seeder for the specific entity (boilerplate)
├── package.json
├── routes
│   └── newService.routes.ts # the routes definition for the service
├── server.ts # the entry point for the service
├── services
│   └── newService.service.ts # the business logic for the service
├── tsconfig.json
└── vitest.config.ts -> ../vitest.config.ts # symlinked from parent for consistency
```

### Environment Variables

Required environment variables:
```bash
DATABASE_URL=your_database_connection_string
PORT=service_port_number
NODE_ENV=development|production
```

### Next Steps

After creating a service:
1. Define your data model in the entity file
2. Implement your business logic in the service
3. Set up your API routes
4. Add test data using the seeder
5. Configure environment variables
6. Write tests for your implementation

### Common Issues

1. **Database Connection**: Ensure your database credentials are correct in the environment variables
2. **Port Conflicts**: Check that the PORT specified isn't already in use
3. **Dependencies**: Run `npm install` if you see missing dependency errors

### Best Practices

1. Keep services focused on a single responsibility
2. Use the interface for defining your service contract
3. Implement proper error handling in your service layer
4. Write comprehensive tests for your business logic
5. Use DtoMappers for data transformation between layers
