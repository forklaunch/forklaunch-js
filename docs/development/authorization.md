---
title: Framework - Authorization
category: References
description: Reference for Authorization in ForkLaunch using IAM and Billing utilities.
---

## Overview

ForkLaunch provides built-in authorization through the ContractDetails auth property, combining authentication methods with access control strategies. This guide covers how to use IAM and Billing utilities to implement role-based access control (RBAC) and feature-based entitlements.

## Quick Start

### 1. Import What You Need

```typescript
// RBAC constants (roles, permissions)
import { PLATFORM_ADMIN_ROLES, PERMISSIONS, ROLE_PERMISSIONS } from '@forklaunch/iam-base/rbac';

// Cache services
import { createAuthCacheService } from '@forklaunch/iam-base/cache';
import { createBillingCacheService } from '@forklaunch/billing-base/cache';

// Surfacing functions (for middleware)
import { createSurfaceRoles, createSurfacePermissions } from '@forklaunch/iam-base/surfacing';
import { createSurfaceSubscription, createSurfaceFeatures } from '@forklaunch/billing-base/surfacing';

// Feature flags
import { FEATURE_FLAGS, getFeaturesForPlan } from '@forklaunch/billing-base/feature-flags';
```

### 2. Configure Server Auth

```typescript
import { forklaunchExpress } from '@forklaunch/express';
import { createSurfaceRoles, createSurfacePermissions } from '@forklaunch/iam-base/surfacing';
import { createSurfaceFeatures } from '@forklaunch/billing-base/surfacing';
import { createAuthCacheService } from '@forklaunch/iam-base/cache';
import { createBillingCacheService } from '@forklaunch/billing-base/cache';

// Create cache services
const authCacheService = createAuthCacheService(redisCache);
const billingCacheService = createBillingCacheService(redisCache);

// Create surfacing functions
const surfaceRoles = await createSurfaceRoles({
  authCacheService,
  iamUrl: process.env.IAM_URL,
  hmacSecretKey: process.env.HMAC_SECRET
});

const surfacePermissions = await createSurfacePermissions({
  authCacheService,
  iamUrl: process.env.IAM_URL,
  hmacSecretKey: process.env.HMAC_SECRET
});

const surfaceFeatures = await createSurfaceFeatures({
  billingCacheService,
  billingUrl: process.env.BILLING_URL
});

// Configure server with auth
const app = forklaunchExpress(schemaValidator, telemetry, {
  auth: {
    mapRoles: surfaceRoles,
    mapPermissions: surfacePermissions,
    mapFeatures: surfaceFeatures
  }
});
```

### 3. Protect Routes

```typescript
import { handlers, schemaValidator } from '@forklaunch/blueprint-core';
import { PLATFORM_ADMIN_ROLES } from '@forklaunch/iam-base/rbac';
import { FEATURE_FLAGS } from '@forklaunch/billing-base/feature-flags';

export const protectedRoute = handlers.get(
  schemaValidator,
  '/admin/dashboard',
  {
    name: 'getAdminDashboard',
    auth: {
      method: 'jwt',
      allowedRoles: PLATFORM_ADMIN_ROLES,
      requiredFeatures: [FEATURE_FLAGS.ADVANCED_ANALYTICS]
    },
    responses: { 200: DashboardSchema }
  },
  async (req, res) => {
    // Only admins with ADVANCED_ANALYTICS feature can access
  }
);
```

## IAM Module Exports

### rbac.ts - Roles and Permissions

```typescript
import {
  // Role definitions
  ROLES,                      // { VIEWER, EDITOR, ADMIN, SYSTEM }
  PLATFORM_VIEWER_ROLES,      // Set of all roles (viewer+)
  PLATFORM_EDITOR_ROLES,      // Set of editor+ roles
  PLATFORM_ADMIN_ROLES,       // Set of admin+ roles
  PLATFORM_SYSTEM_ROLES,      // Set of system roles only
  
  // Permission definitions
  PERMISSIONS,                // { PLATFORM_READ, PLATFORM_WRITE }
  PLATFORM_READ_PERMISSIONS,  // Set of read permissions
  PLATFORM_WRITE_PERMISSIONS, // Set of write permissions
  
  // Role-permission mapping
  ROLE_PERMISSIONS            // Record<ROLES, PERMISSIONS[]>
} from '@forklaunch/iam-base/rbac';
```

**Usage in Controllers:**
```typescript
// Require admin role
auth: { allowedRoles: PLATFORM_ADMIN_ROLES }

// Require write permission
auth: { allowedPermissions: PLATFORM_WRITE_PERMISSIONS }

// Check specific role
if (PLATFORM_ADMIN_ROLES.has(user.role)) { ... }
```

### cache.ts - Auth Cache Service

```typescript
import { createAuthCacheService, AuthCacheService, CacheLike } from '@forklaunch/iam-base/cache';

const authCache = createAuthCacheService(redisCache);

// Methods available:
await authCache.getCachedRoles(userId);           // Get cached roles
await authCache.setCachedRoles(userId, roles);    // Cache roles
await authCache.getCachedPermissions(userId);     // Get cached permissions
await authCache.setCachedPermissions(userId, permissions);
await authCache.deleteAllCachedData(userId);      // Clear user cache
```

### surfacing.ts - Role/Permission Surfacing

**Remote Surfacing (calls IAM service via SDK):**
```typescript
import { createSurfaceRoles, createSurfacePermissions } from '@forklaunch/iam-base/surfacing';

const surfaceRoles = await createSurfaceRoles({
  authCacheService,
  iamUrl: 'http://iam-service:3000',
  hmacSecretKey: process.env.HMAC_SECRET
});

// Returns function: (payload: { sub?: string }) => Promise<Set<string>>
const roles = await surfaceRoles({ sub: userId });
```

**Local Surfacing (direct database access):**
```typescript
import { createSurfaceRolesLocally, createSurfacePermissionsLocally } from '@forklaunch/iam-base/surfacing';

const surfaceRoles = createSurfaceRolesLocally({
  authCacheService,
  userService // Must have surfaceRoles({ id }) method
});
```

## Billing Module Exports

### feature-flags.ts - Feature Definitions

```typescript
import {
  FEATURE_FLAGS,           // Define your feature flags here
  PLAN_FEATURES,           // Map of plan -> features
  PLAN_LIMITS,             // Map of plan -> resource limits
  getFeaturesForPlan,      // Get features for a plan name
  getLimitsForPlan,        // Get limits for a plan name
  isPlanFeatureAvailable,  // Check if plan has feature
  hasRequiredFeatures,     // Check if all features present
  getMissingFeatures       // Get missing feature list
} from '@forklaunch/billing-base/feature-flags';
```

**Defining Features:**
```typescript
// In feature-flags.ts
export const FEATURE_FLAGS = {
  ADVANCED_ANALYTICS: 'advanced_analytics',
  CUSTOM_BRANDING: 'custom_branding',
  API_ACCESS: 'api_access'
} as const;

export const PLAN_FEATURES = {
  free: [],
  pro: [FEATURE_FLAGS.ADVANCED_ANALYTICS, FEATURE_FLAGS.API_ACCESS],
  enterprise: Object.values(FEATURE_FLAGS)
};
```

### cache.ts - Billing Cache Service

```typescript
import { createBillingCacheService, BillingCacheService } from '@forklaunch/billing-base/cache';

const billingCache = createBillingCacheService(redisCache);

// Subscription caching
await billingCache.getCachedSubscription(orgId);
await billingCache.setCachedSubscription(orgId, subscriptionData);

// Feature caching
await billingCache.getCachedFeatures(orgId);
await billingCache.setCachedFeatures(orgId, features);

// Entitlement caching
await billingCache.getCachedEntitlements(partyKey);
await billingCache.setCachedEntitlements(partyKey, entitlementData);
```

### surfacing.ts - Subscription/Feature Surfacing

**Remote Surfacing (from cache, populated by webhooks):**
```typescript
import { createSurfaceSubscription, createSurfaceFeatures } from '@forklaunch/billing-base/surfacing';

const surfaceSubscription = await createSurfaceSubscription({
  billingCacheService,
  billingUrl: 'http://billing-service:3000'
});

const surfaceFeatures = await createSurfaceFeatures({
  billingCacheService,
  billingUrl: 'http://billing-service:3000'
});
```

**Local Surfacing (direct database access):**
```typescript
import { createSurfaceSubscriptionLocally, createSurfaceFeaturesLocally } from '@forklaunch/billing-base/surfacing';

const surfaceSubscription = createSurfaceSubscriptionLocally({
  billingCacheService,
  subscriptionService // Must have getActiveSubscription({ organizationId }) method
});
```

**Validation Helpers:**
```typescript
import { validateRequiredFeatures, validateActiveSubscription } from '@forklaunch/billing-base/surfacing';

const featureCheck = validateRequiredFeatures(['api_access'], userFeatures);
// { allowed: boolean, missingFeatures: string[] }

const subscriptionCheck = validateActiveSubscription(subscription);
// { allowed: boolean, reason?: 'NO_SUBSCRIPTION' | 'INACTIVE' }
```

## Authorization Methods

### JWT Authentication
```typescript
auth: {
  method: 'jwt',
  allowedRoles: PLATFORM_ADMIN_ROLES
}
```

### Basic Authentication
```typescript
auth: {
  method: 'basic',
  login: (username, password) => validateCredentials(username, password)
}
```

### HMAC Authentication (Service-to-Service)
```typescript
import { generateHmacAuthHeaders } from '@forklaunch/iam-base/surfacing';

const headers = generateHmacAuthHeaders({
  secretKey: process.env.HMAC_SECRET,
  method: 'GET',
  path: '/api/v1/users/123/roles'
});
```

## Stripe Integration

### Feature Sync from Stripe Products

Features are automatically synced from Stripe product metadata to your Plan entities:

1. **Set features in Stripe Dashboard:**
   - Go to Products → Select Product → Metadata
   - Add key: `features`
   - Add value: `"feature1,feature2,feature3"` (comma-separated)
   - Or: `'["feature1","feature2","feature3"]'` (JSON array)

2. **Webhook events that trigger sync:**
   - `product.created` / `product.updated` - Syncs features to all associated plans
   - `plan.created` / `plan.updated` - Fetches product and syncs features
   - `price.created` / `price.updated` - Same as plan events

3. **Cached subscription data includes:**
   - `planName` - Name from Stripe product
   - `status` - Subscription status (active, trialing, etc.)
   - `features` - Array of feature slugs from product metadata

## Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 401 | No Authorization token provided | Missing auth header |
| 401 | Invalid Authorization token format | Wrong token format |
| 403 | Invalid Authorization subject | JWT missing subject |
| 403 | Invalid Authorization permissions | Permission check failed |
| 403 | Invalid Authorization roles | Role check failed |
| 403 | Missing required features | Feature entitlement failed |
| 403 | No active subscription | Subscription check failed |

## Best Practices

1. **Use Role Sets, Not Individual Roles**
   ```typescript
   // ✅ Good - uses hierarchical set
   allowedRoles: PLATFORM_ADMIN_ROLES
   
   // ❌ Avoid - bypasses hierarchy
   allowedRoles: new Set(['admin'])
   ```

2. **Cache Everything**
   ```typescript
   // Surfacing functions handle caching automatically
   const roles = await surfaceRoles({ sub: userId });
   // First call: fetches from IAM service, caches result
   // Subsequent calls: returns from cache
   ```

3. **Use Local Surfacing Within Same Service**
   ```typescript
   // In IAM service itself, use local surfacing
   const surfaceRoles = createSurfaceRolesLocally({
     authCacheService,
     userService: iamUserService
   });
   
   // In other services, use remote surfacing
   const surfaceRoles = await createSurfaceRoles({
     authCacheService,
     iamUrl: process.env.IAM_URL,
     hmacSecretKey: process.env.HMAC_SECRET
   });
   ```

4. **Define Features as Constants**
   ```typescript
   // ✅ Good - type-safe, refactorable
   requiredFeatures: [FEATURE_FLAGS.ADVANCED_ANALYTICS]
   
   // ❌ Avoid - typo-prone, no type checking
   requiredFeatures: ['advnaced_analytics']
   ```

## Related Documentation

- **[HTTP Frameworks](/docs/framework/http)** - ContractDetails and route configuration
- **[Validation](/docs/framework/validation)** - Input validation and schema definitions
- **[Error Handling](/docs/framework/error-handling)** - Authentication and permission error handling
- **[Telemetry](/docs/framework/telemetry)** - Authorization event logging and tracing
