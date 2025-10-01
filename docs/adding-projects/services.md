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

### Command Options

| Option | Short | Description | Valid Values |
| :----- | :---- | :---------- | :----------- |
| `--database` | `-d` | The database to use | `postgresql`, `mysql`, `mariadb`, `mssql`, `mongodb`, `libsql`, `sqlite`, `better-sqlite` |
| `--infrastructure` | `-i` | Add optional infrastructure (can specify multiple) | `redis`, `s3` |
| `--path` | `-p` | The path to initialize the service in | Any valid directory path |
| `--description` | `-D` | The description of the service | Any string |
| `--dryrun` | `-n` | Dry run the command | Flag (no value) |

### Service Aliases

The `service` command has several aliases for convenience:
- `svc`
- `project` 
- `proj`

### Project Structure

A service follows the standard ForkLaunch RCSIDES structure:

```bash
service-name/
├── api/
│   ├── controllers/     # HTTP request handlers
│   └── routes/         # Route definitions
├── domain/
│   ├── enum/           # Enumerations and constants
│   ├── mappers/        # Data transformation logic
│   ├── schemas/        # Validation schemas
│   └── types/          # TypeScript type definitions
├── persistence/
│   ├── entities/       # Database entity definitions
│   ├── seeders/        # Database seed data
│   └── seed.data.ts    # Seed configuration
├── services/
│   └── serviceLogic.ts # Business logic implementation
├── bootstrapper.ts     # Service initialization
├── index.ts           # Service entry point
├── registrations.ts   # Dependency injection setup
├── server.ts          # HTTP server configuration
├── package.json       # Dependencies and scripts
├── mikro-orm.config.ts # Database ORM configuration
├── tsconfig.json      # TypeScript configuration
├── eslint.config.mjs  # ESLint configuration
└── .gitignore         # Git ignore rules
```

### Service Features

Each service includes:
- **Complete RCSIDES Stack**: Routes, Controllers, Services, Interfaces, Domain, Entities, Seeders
- **Database Integration**: Full ORM setup with migrations and seeders
- **API Documentation**: OpenAPI/Swagger documentation generation
- **Validation**: Request/response validation with configurable validators
- **Testing**: Test setup with chosen test framework
- **Docker Support**: Dockerfile and docker-compose integration
- **Infrastructure**: Optional Redis and S3 integration

### Environment Variables

Required environment variables:
```bash
# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DATABASE_TYPE=postgresql

# Server configuration
PORT=3000
NODE_ENV=development

# Infrastructure (if enabled)
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your_bucket_name
```

### Usage Examples

```bash
# Basic service
forklaunch init service users --database postgresql

# Service with Redis cache
forklaunch init service products --database postgresql --infrastructure redis

# Service with multiple infrastructure
forklaunch init service files --database postgresql --infrastructure redis s3

# Custom path and description
forklaunch init service orders --path ./services --description "Order management service"
```

### Next Steps

After creating a service:
1. Configure environment variables in `.env.local`
2. Define your data model in the entities
3. Implement your business logic in the service layer
4. Set up your API routes and controllers  
5. Run database migrations: `npm run migrate:up`
6. Add test data using seeders: `npm run seed`
7. Start the service: `npm run dev`
8. Review the API documentation at `/docs`

### Common Issues

1. **Database Connection**: Ensure database is running and environment variables are correct
2. **Port Conflicts**: Services use sequential ports (3000, 3001, etc.)
3. **Migration Errors**: Run migrations before starting the service
4. **Infrastructure Dependencies**: Ensure Redis/S3 are configured if enabled
5. **Path Conflicts**: Avoid service names that conflict with existing directories

### Best Practices

1. **Single Responsibility**: Keep services focused on one business domain
2. **RCSIDES Pattern**: Use the full stack for clean architecture
3. **Error Handling**: Implement comprehensive error handling in service layer
4. **Validation**: Use domain schemas for request/response validation
5. **Testing**: Write tests for business logic and API endpoints
6. **Documentation**: Document API endpoints and business rules
7. **Infrastructure**: Use Redis for caching, S3 for file storage when needed
