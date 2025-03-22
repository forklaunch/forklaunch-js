---
title: Framework - Universal SDK
category: References
description: Reference for using the ForkLaunch Universal SDK.
---

## Overview

The Universal SDK provides a type-safe way to interact with ForkLaunch APIs across any typescript client. It handles:
- URL parameter encoding
- Query string formatting
- Request/response type safety
- Header management
- JSON parsing

Chaining requests copies correlation ID and other useful debugging context.

## Basic Usage

```typescript
// Initialize SDK
const sdk = new UniversalSdk('https://api.example.com');

// Make requests
const response = await sdk.get('/users/:id', {
  params: { id: 123 },
  query: { include: 'profile' },
  headers: { 'x-api-key': 'key' }
});
```

## Request Methods

### GET Requests
```typescript
await sdk.get('/path', {
  params: { id: '123' },
  query: { filter: 'active' },
  headers: { 'x-api-key': 'key' }
});
```

### POST/PUT/PATCH Requests
```typescript
await sdk.post('/users', {
  body: { name: 'John', email: 'john@example.com' },
  headers: { 'x-api-key': 'key' }
});
```

### DELETE Requests
```typescript
await sdk.delete('/users/:id', {
  params: { id: '123' }
});
```

## Request Options

### URL Parameters
```typescript
type RequestParams = {
  params?: Record<string, string | number | boolean>;
}
```
Replace `:paramName` in routes with actual values.

### Query Parameters
```typescript
type RequestQuery = {
  query?: Record<string, string | number | boolean>;
}
```
Added as `?key=value` to the URL.

### Request Body
```typescript
type RequestBody = {
  body?: Record<string, unknown>;
}
```
Automatically JSON stringified.

### Headers
```typescript
type RequestHeaders = {
  headers?: Record<string, string>;
}
```
Custom headers for the request.

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

```typescript
try {
  const response = await sdk.get('/users');
  if (response.code >= 400) {
    // Handle error response
    console.error(response.content);
  }
} catch (error) {
  // Handle network/parsing errors
  console.error(error);
}
```

## Best Practices
1. **Base URL Configuration**
   ```typescript
   const sdk = new UniversalSdk(process.env.API_URL);
   ```

2. **Header Management**
   ```typescript
   // Reuse common headers
   const headers = {
     'x-api-key': 'key',
     'x-tenant-id': 'tenant'
   };
   
   await sdk.get('/users', { headers });
   ```

## Features

- Automatic content-type handling
- JSON response parsing
- URL parameter interpolation
- Query string formatting
- Error standardization
- Type-safe requests/responses

