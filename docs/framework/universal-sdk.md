---
title: Framework - Universal SDK
category: References
description: Reference for using the ForkLaunch Universal SDK.
---

## Overview

The Universal SDK (`@forklaunch/universal-sdk`) provides a type-safe, cross-runtime HTTP client for interacting with ForkLaunch APIs. Built on AJV for validation and supporting multiple content types, it offers:

- **Proxy-based method chaining** for intuitive API calls
- **Automatic OpenAPI schema validation** using AJV
- **Cross-runtime compatibility** (Node.js, Bun, browsers)
- **Type-safe request/response handling** with full TypeScript support
- **Content type parsing** with extensible parser mapping
- **URL parameter encoding** and query string formatting
- **Request correlation** and debugging context preservation

## Package Structure

The Universal SDK is built on:
- **AJV** for JSON Schema validation and type coercion
- **OpenAPI 3.0** schema integration for automatic API discovery
- **Proxy-based architecture** for method chaining and path resolution
- **Content type mapping** for flexible response parsing

## Basic Usage

### SDK Initialization

```typescript
import { universalSdk } from '@forklaunch/universal-sdk';

// Initialize SDK with OpenAPI registry
const sdk = await universalSdk<LiveAPIType>({
  host: 'https://api.example.com',
  registryOptions: {
    // OpenAPI schema registry configuration
    openApiJson: openApiSchema,
    openApiHash: 'schema-hash-for-caching'
  }
});

// Make fetch requests
const response = await sdk.fetch('/users/:id', {
  method: 'GET',
  params: { id: 123 },
  query: { include: 'profile' },
  headers: { 'x-api-key': 'key' }
});
```

### Content Type Parsing

```typescript
// Custom content type parsers
const sdk = await universalSdk<LiveAPIType>({
  host: 'https://api.example.com',
  registryOptions: {
    openApiJson: openApiSchema,
    openApiHash: 'schema-hash'
  },
  contentTypeParserMap: {
    'application/json': (data) => JSON.parse(data),
    'application/xml': (data) => parseXML(data),
    'text/csv': (data) => parseCSV(data)
  }
});
```

### SDK Method Chaining
The Universal SDK automatically generates method paths based on your router route registrations:

```typescript
// Router configuration with route registrations
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator);

// Routes are registered with contract details that determine SDK method names
userRouter.post('/create', {
  name: 'createUser',  // This becomes the SDK method name
  body: userSchema,
  responses: { 201: userResponseSchema }
}, createUserHandler);

userRouter.get('/:id', {
  name: 'getUserById',  // This becomes the SDK method name
  params: { id: z.string() },
  responses: { 200: userResponseSchema }
}, getUserHandler);

// Alternative: router with custom sdkName
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator, internal, [], telemetry, 'userService');

userRouter.post('/create', {
  // No name provided - uses basePath converted to camelCase
  body: userSchema,
  responses: { 201: userResponseSchema }
}, createUserHandler);

// SDK method calls are constructed as:
// sdk.{contractDetails.name || camelCase(basePath)}()

// Using contract names:
await sdk.createUser(userData);           // From contract.name = 'createUser'
await sdk.getUserById({ params: { id: '123' } });  // From contract.name = 'getUserById'

// Using router sdkName or basePath:
await sdk.userService(userData);          // When no contract.name, uses router.sdkName
await sdk.apiUsers(userData);             // When no contract.name or sdkName, uses camelCase(basePath)
```

### Path Construction Rules

1. **SDK Method Name**: `contractDetails.name` (if provided) OR `camelCase(router.basePath)`
2. **Router SDK Namespace**: When using router nesting, `router.sdkName` (if provided) OR `camelCase(router.basePath)`

```typescript
// Example route registrations:
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator);

userRouter.post('/create', {
  name: 'createUser',           // → sdk.createUser()
  body: userSchema,
  responses: { 201: userSchema }
}, handler);

userRouter.get('/list', {
  name: 'listUsers',            // → sdk.listUsers()
  query: filterSchema,
  responses: { 200: userArraySchema }
}, handler);

userRouter.delete('/:id', {
  // No name - uses router basePath
  params: { id: z.string() },   // → sdk.apiUsers() (camelCase of '/api/users')
  responses: { 204: z.void() }
}, handler);

// Router with custom sdkName
const adminRouter = new ForklaunchExpressLikeRouter(
  '/admin/api', 
  validator, 
  internal, 
  [], 
  telemetry, 
  'adminPanel'  // sdkName
);

adminRouter.get('/health', {
  // No name - uses sdkName        // → sdk.adminPanel()
  responses: { 200: healthSchema }
}, handler);

const sdk = createUniversalSdk([userRouter, adminRouter]);
```

## Request Methods

### Fetch API Pattern
The Universal SDK supports traditional fetch-style calls using the full route paths from your router registrations:

```typescript
// Given router registrations:
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator);
userRouter.get('/', { name: 'listUsers', ... }, handler);
userRouter.post('/create', { name: 'createUser', ... }, handler);
userRouter.put('/:id', { name: 'updateUser', ... }, handler);
userRouter.delete('/:id', { name: 'deleteUser', ... }, handler);

// Fetch calls use the full path (basePath + route path):

// GET request
await sdk.fetch('/api/users', {
  query: { filter: 'active' },
  headers: { 'x-api-key': 'key' }
});

// POST request  
await sdk.fetch('/api/users/create', {
  body: { name: 'John', email: 'john@example.com' },
  headers: { 'x-api-key': 'key' }
});

// PUT request
await sdk.fetch('/api/users/:id', {
  params: { id: '123' },
  body: { name: 'John Updated' }
});

// DELETE request
await sdk.fetch('/api/users/:id', {
  params: { id: '123' }
});
```

### SDK Method Pattern
The proxy automatically tracks method chains and executes the corresponding API call based on route registrations:

```typescript
// Define routers with route registrations:
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator);
userRouter.post('/create', {
  name: 'createUser',
  body: userSchema,
  responses: { 201: userSchema }
}, createHandler);

userRouter.get('/list', {
  name: 'listUsers',
  query: filterSchema,
  responses: { 200: userArraySchema }
}, listHandler);

const authRouter = new ForklaunchExpressLikeRouter('/auth', validator);
authRouter.post('/login', {
  name: 'login',
  body: loginSchema,
  responses: { 200: tokenSchema }
}, loginHandler);

authRouter.post('/logout', {
  name: 'logout',
  responses: { 204: z.void() }
}, logoutHandler);

// When used in a main router:
const mainRouter = new ForklaunchExpressLikeRouter('/api', validator);
mainRouter.use(userRouter);  // Nested under /api
mainRouter.use(authRouter);  // Nested under /api

// Method calls are resolved to route handlers:
await sdk.createUser(userData);    // → calls userRouter's 'createUser' handler
await sdk.listUsers(filters);     // → calls userRouter's 'listUsers' handler  
await sdk.login(credentials);     // → calls authRouter's 'login' handler
await sdk.logout();              // → calls authRouter's 'logout' handler

// The method name (e.g., "createUser") is passed to executeSdkCall()
// which resolves it to the actual route handler function
```

## Request Options

### Fetch Options
When using `sdk.fetch()`, you can pass standard fetch options:

```typescript
type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, string | number | boolean>;
  query?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}
```

### URL Parameters
```typescript
// Replace :paramName in routes with actual values
await sdk.fetch('/users/:id/posts/:postId', {
  params: { id: '123', postId: '456' }
});
```

### Query Parameters
```typescript
// Added as ?key=value to the URL
await sdk.fetch('/users', {
  query: { 
    filter: 'active',
    limit: 10,
    include: 'profile'
  }
});
```

### Request Body
```typescript
// Automatically JSON stringified
await sdk.fetch('/users', {
  method: 'POST',
  body: { 
    name: 'John', 
    email: 'john@example.com',
    metadata: { role: 'admin' }
  }
});
```

### Headers
```typescript
// Custom headers for the request
await sdk.fetch('/users', {
  headers: {
    'x-api-key': 'your-api-key',
    'x-tenant-id': 'tenant-123',
    'content-type': 'application/json'
  }
});
```

## SDK Method Arguments

When using the chained method syntax, arguments are passed directly to the method:

```typescript
// Single argument
await sdk.users.create({ name: 'John', email: 'john@example.com' });

// Multiple arguments
await sdk.auth.login('username', 'password', { remember: true });

// No arguments
await sdk.health.check();
```

## Response Format

All requests return a standardized response:
```typescript
interface ResponseType {
  // HTTP status code
  code: number;
  
  // Response body (parsed JSON or text)
  content: unknown;
  
  // Response headers
  headers: Headers;
}
```

## Error Handling

### Fetch Pattern
```typescript
try {
  const response = await sdk.fetch('/users');
  if (response.code >= 400) {
    console.error('API Error:', response.content);
  }
} catch (error) {
  console.error('Network Error:', error);
}
```

### SDK Method Pattern
```typescript
try {
  const user = await sdk.users.create(userData);
  console.log('User created:', user);
} catch (error) {
  if (error.message.includes('SDK method not found')) {
    console.error('Method does not exist on the API');
  } else {
    console.error('API Error:', error);
  }
}
```

## Best Practices

### 1. Base URL Configuration
```typescript
const sdk = createUniversalSdk(process.env.API_URL);
```

### 2. Header Management
```typescript
// Reuse common headers with fetch
const commonHeaders = {
  'x-api-key': 'key',
  'x-tenant-id': 'tenant'
};

await sdk.fetch('/users', { headers: commonHeaders });
```

### 3. Method Naming Conventions
Structure your route registrations with clear, descriptive contract names:

```typescript
// Good router setup with clear contract names:
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator, internal, [], telemetry, 'users');

userRouter.get('/', {
  name: 'listUsers',        // → sdk.users.listUsers()
  query: filterSchema,
  responses: { 200: userArraySchema }
}, listHandler);

userRouter.post('/create', {
  name: 'createUser',       // → sdk.users.createUser()
  body: userCreateSchema,
  responses: { 201: userSchema }
}, createHandler);

userRouter.put('/:id', {
  name: 'updateUser',       // → sdk.users.updateUser()
  params: { id: z.string() },
  body: userUpdateSchema,
  responses: { 200: userSchema }
}, updateHandler);

userRouter.delete('/:id', {
  name: 'deleteUser',       // → sdk.users.deleteUser()
  params: { id: z.string() },
  responses: { 204: z.void() }
}, deleteHandler);

userRouter.get('/:id/profile', {
  name: 'getUserProfile',   // → sdk.users.getUserProfile()
  params: { id: z.string() },
  responses: { 200: userProfileSchema }
}, profileHandler);

const authRouter = new ForklaunchExpressLikeRouter('/auth', validator);

authRouter.post('/login', {
  name: 'login',            // → sdk.login()
  body: loginSchema,
  responses: { 200: tokenSchema }
}, loginHandler);

authRouter.post('/logout', {
  name: 'logout',           // → sdk.logout()
  responses: { 204: z.void() }
}, logoutHandler);

authRouter.post('/refresh', {
  name: 'refreshToken',     // → sdk.refreshToken()
  body: refreshSchema,
  responses: { 200: tokenSchema }
}, refreshHandler);

// When used in a main router with nesting:
const mainRouter = new ForklaunchExpressLikeRouter('/api', validator);
mainRouter.use(userRouter);  // Creates sdk.users.*
mainRouter.use(authRouter);  // Creates sdk.login, sdk.logout, etc.

// Usage becomes intuitive:
const users = await sdk.users.listUsers();
const newUser = await sdk.users.createUser(userData);
await sdk.login(credentials);
```

### 4. Type Safety
Define your schemas and handlers to get full TypeScript support:

```typescript
// Define your schemas using zod or other validator
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string()
});

const userCreateSchema = z.object({
  name: z.string(),
  email: z.string()
});

const userUpdateSchema = userCreateSchema.partial();

type User = z.infer<typeof userSchema>;
type UserCreateRequest = z.infer<typeof userCreateSchema>;

// Define router with proper typing through schemas
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator);

userRouter.get('/', {
  name: 'listUsers',
  query: z.object({ filter: z.string().optional() }),
  responses: { 200: z.array(userSchema) }
}, async (req, res) => {
  // Handler implementation with full type safety
  const users: User[] = await getUsersFromDb(req.query.filter);
  res.status(200).json(users);
});

userRouter.post('/create', {
  name: 'createUser',
  body: userCreateSchema,
  responses: { 201: userSchema }
}, async (req, res) => {
  // req.body is typed as UserCreateRequest
  const newUser: User = await createUserInDb(req.body);
  res.status(201).json(newUser);
});
} as const;

// Type-safe SDK creation
const sdk = createUniversalSdk([userRouter]);

// Now you get full type safety and IntelliSense:
const users = await sdk.users.listUsers();        // TypeScript knows this returns Promise<User[]>
const newUser = await sdk.users.createUser({      // TypeScript enforces UserCreateRequest shape
  name: 'John',
  email: 'john@example.com'
});                                                // Returns Promise<User>

// TypeScript will catch errors:
// await sdk.users.createUser({ invalid: 'data' }); // ❌ Type error
// await sdk.users.nonExistentMethod();             // ❌ Type error
```

## Features

- **Dual API patterns**: Support both fetch-style and method chaining
- **Automatic path tracking**: Method chains are converted to API calls
- **Type-safe requests/responses**: Full TypeScript support
- **Automatic content-type handling**: JSON parsing and stringification
- **URL parameter interpolation**: Replace :params in URLs
- **Query string formatting**: Automatic query parameter encoding
- **Error standardization**: Consistent error handling
- **Proxy-based routing**: Dynamic method resolution

## Migration from Previous Versions

If you're upgrading from the previous Universal SDK:

### Before (Direct HTTP Methods)
```typescript
await sdk.get('/users/:id', { params: { id: 123 } });
await sdk.post('/users', { body: userData });
await sdk.put('/users/:id', { params: { id: 123 }, body: userData });
await sdk.delete('/users/:id', { params: { id: 123 } });
```

### After (Router-Based Configuration)

**Option 1: Use the new fetch syntax**
```typescript
await sdk.fetch('/users/:id', { 
  method: 'GET', 
  params: { id: 123 } 
});

await sdk.fetch('/users', {
  method: 'POST',
  body: userData
});
```

**Option 2: Configure routers for method chaining**
```typescript
// Configure your routers with route registrations
const userRouter = new ForklaunchExpressLikeRouter('/api/users', validator, internal, [], telemetry, 'users');

userRouter.get('/:id', {
  name: 'getUser',
  params: { id: z.string() },
  responses: { 200: userSchema }
}, getUserHandler);

userRouter.post('/create', {
  name: 'createUser',
  body: userCreateSchema,
  responses: { 201: userSchema }
}, createUserHandler);

userRouter.put('/:id', {
  name: 'updateUser',
  params: { id: z.string() },
  body: userUpdateSchema,
  responses: { 200: userSchema }
}, updateUserHandler);

userRouter.delete('/:id', {
  name: 'deleteUser',
  params: { id: z.string() },
  responses: { 204: z.void() }
}, deleteUserHandler);

const sdk = createUniversalSdk([userRouter]);

// Use the generated methods
await sdk.users.getUser({ params: { id: '123' } });
await sdk.users.createUser(userData);
await sdk.users.updateUser({ params: { id: '123' }, body: userData });
await sdk.users.deleteUser({ params: { id: '123' } });
```

### Key Changes
1. **Router Registration**: Create routers with `new ForklaunchExpressLikeRouter()` and register routes with contract details
2. **Contract Names**: Use the `name` field in contract details to define SDK method names
3. **SDK Namespace**: Uses `sdkName` parameter in router constructor or camel-cased `basePath`
4. **Type Safety**: Full TypeScript support through schema validation and contract details


