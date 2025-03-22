---
title: Framework - Authorization
category: References
description: Reference for Authorization in ForkLaunch.
---

## Overview

ForkLaunch provides built-in authorization through the ContractDetails auth property, combining authentication methods with access control strategies.

## Authorization Methods

Choose an authentication base and combine it with either permission-based or role-based access control.

### Authentication Bases

#### JWT Authentication
```typescript
const baseAuth = {
  method: 'jwt'  // Validates Bearer tokens using JWT_SECRET
}
```

#### Basic Authentication
```typescript
const baseAuth = {
  method: 'basic',
  login: (username: string, password: string) => boolean
}
```

#### Custom Authentication
```typescript
const baseAuth = {
  method: 'other',
  tokenPrefix: 'Custom',
  headerName: 'X-Custom-Auth', // optional, defaults to 'Authorization'
  decodeResource: (token: string) => string
}
```

### Access Control Strategies

#### Permission-Based Access Control
```typescript
const permissionControl = {
  allowedPermissions: new Set(['read:users', 'write:users']),
  forbiddenPermissions: new Set(['delete:users']),
  mapPermissions: async (resourceId, req) => {
    return new Set(['read:users']);
  }
}
```

#### Role-Based Access Control
```typescript
const roleControl = {
  allowedRoles: new Set(['admin', 'editor']),
  forbiddenRoles: new Set(['blocked']),
  mapRoles: async (resourceId, req) => {
    return new Set(['editor']);
  }
}
```

## Implementation Examples

### JWT + Permissions
```typescript
const contractDetails = {
  auth: {
    method: 'jwt',
    allowedPermissions: new Set(['read:users']),
    mapPermissions: async (resourceId, req) => {
      return new Set(['read:users']);
    }
  }
}
```

### JWT + Roles
```typescript
const contractDetails = {
  auth: {
    method: 'jwt',
    allowedRoles: new Set(['admin']),
    mapRoles: async (resourceId, req) => {
      return new Set(['admin']);
    }
  }
}
```

### Basic Auth + Permissions
```typescript
const contractDetails = {
  auth: {
    method: 'basic',
    login: (username, password) => true,
    allowedPermissions: new Set(['read:users']),
    mapPermissions: async (resourceId, req) => {
      return new Set(['read:users']);
    }
  }
}
```

### Basic Auth + Roles
```typescript
const contractDetails = {
  auth: {
    method: 'basic',
    login: (username, password) => true,
    allowedRoles: new Set(['admin']),
    mapRoles: async (resourceId, req) => {
      return new Set(['admin']);
    }
  }
}
```

### Custom Auth + Permissions
```typescript
const contractDetails = {
  auth: {
    method: 'other',
    tokenPrefix: 'Custom',
    decodeResource: (token) => token,
    allowedPermissions: new Set(['read:users']),
    mapPermissions: async (resourceId, req) => {
      return new Set(['read:users']);
    }
  }
}
```

### Custom Auth + Roles
```typescript
const contractDetails = {
  auth: {
    method: 'other',
    tokenPrefix: 'Custom',
    decodeResource: (token) => token,
    allowedRoles: new Set(['admin']),
    mapRoles: async (resourceId, req) => {
      return new Set(['admin']);
    }
  }
}
```

## Best Practices

1. **Choose Authentication Base**
   - JWT for modern web applications
   - Basic Auth for simple scenarios
   - Custom Auth for special requirements

2. **Choose Access Control Strategy**
   - Permissions for granular control
   - Roles for simpler management
   - Can combine both for complex scenarios

3. **Security Considerations**
   - Always use HTTPS in production
   - Implement proper token validation
   - Keep permissions/roles granular
   - Document access requirements

## Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 401 | No Authorization token provided | Missing auth header |
| 401 | Invalid Authorization token format | Wrong token format |
| 403 | Invalid Authorization subject | JWT missing subject |
| 403 | Invalid Authorization permissions | Permission check failed |
| 403 | Invalid Authorization roles | Role check failed |
| 403 | Invalid Authorization token | Token validation failed |
| 403 | Invalid Authorization login | Basic auth failed |
| 500 | No permission/role mapping function provided | Missing required mapper |

## Type Safety

The auth configuration is fully typed:
```typescript
type AuthMethods = {
  method: 'jwt' | 'basic' | 'other';
  allowedPermissions?: Set<string>;
  forbiddenPermissions?: Set<string>;
  allowedRoles?: Set<string>;
  forbiddenRoles?: Set<string>;
  mapPermissions?: (resourceId: string, req: Request) => Promise<Set<string>>;
  mapRoles?: (resourceId: string, req: Request) => Promise<Set<string>>;
}
```

## Telemetry

Authorization events are automatically:
- Logged with appropriate severity
- Tagged with correlation IDs
- Tracked for metrics
- Traced for debugging

