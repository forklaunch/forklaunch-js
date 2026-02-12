---
title: IAM and Billing Utilities
description: Reference for IAM and Billing utility modules including RBAC, caching, surfacing, feature flags, and plan management.
---

## Overview

ForkLaunch provides IAM and Billing utility modules that can be imported into any service to implement role-based access control (RBAC) and feature-based entitlements. Each module exposes its utilities through a single `/utils` entry point.

## IAM Module

Import from `@{your-app-name}/iam/utils`.

### RBAC Constants

```typescript
import {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  PLATFORM_ADMIN_ROLES,
  PLATFORM_EDITOR_ROLES,
  PLATFORM_VIEWER_ROLES,
  PLATFORM_SYSTEM_ROLES,
  PLATFORM_READ_PERMISSIONS,
  PLATFORM_WRITE_PERMISSIONS
} from '@{your-app-name}/iam/utils';
```

**Permissions:**

```typescript
const PERMISSIONS = {
  PLATFORM_READ: 'platform:read',
  PLATFORM_WRITE: 'platform:write'
} as const;
```

**Roles:**

```typescript
const ROLES = {
  VIEWER: 'ReadOnly',
  EDITOR: 'ApplicationUser',
  ADMIN: 'ApplicationAdmin',
  SYSTEM: 'SuperAdmin'
} as const;
```

**Role Sets (hierarchical):**

| Constant | Contents |
|----------|----------|
| `PLATFORM_VIEWER_ROLES` | Set of all roles (viewer and above) |
| `PLATFORM_EDITOR_ROLES` | Set of editor and above roles |
| `PLATFORM_ADMIN_ROLES` | Set of admin and above roles |
| `PLATFORM_SYSTEM_ROLES` | Set of system roles only |

**Permission Sets:**

| Constant | Contents |
|----------|----------|
| `PLATFORM_READ_PERMISSIONS` | Set of read permissions |
| `PLATFORM_WRITE_PERMISSIONS` | Set of write permissions |

**Role-Permission Mapping:**

`ROLE_PERMISSIONS` is a `Record` mapping each role to its allowed permissions.

### Auth Cache Service

The auth cache provides a typed caching layer for user roles and permissions.

**Interface:**

```typescript
interface AuthCacheService {
  getCachedRoles(userId: string): Promise<string[] | null>;
  getCachedPermissions(userId: string): Promise<string[] | null>;
  setCachedRoles(userId: string, roles: string[]): Promise<void>;
  setCachedPermissions(userId: string, permissions: string[]): Promise<void>;
  invalidateUserCache(userId: string): Promise<void>;
}
```

**Factory:**

```typescript
import { createAuthCacheService } from '@{your-app-name}/iam/utils';

const authCache = createAuthCacheService(redisCache); // accepts a TtlCache instance

await authCache.setCachedRoles(userId, ['ApplicationAdmin']);
await authCache.setCachedPermissions(userId, ['platform:read', 'platform:write']);

const roles = await authCache.getCachedRoles(userId);       // string[] | null
const perms = await authCache.getCachedPermissions(userId); // string[] | null

await authCache.invalidateUserCache(userId); // clears all cached data for the user
```

### Surfacing Functions

Surfacing functions resolve roles and permissions for a given user. The IAM module provides both remote and local variants.

**Remote surfacing (calls the IAM service over HTTP):**

```typescript
import { createSurfaceRoles, createSurfacePermissions } from '@{your-app-name}/iam/utils';

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

const roles = await surfaceRoles({ sub: userId });
```

**Local surfacing (direct database access, for use within the IAM service itself):**

```typescript
import { createSurfaceRolesLocally, createSurfacePermissionsLocally } from '@{your-app-name}/iam/utils';

const surfaceRoles = createSurfaceRolesLocally({
  authCacheService,
  userService
});

const surfacePermissions = createSurfacePermissionsLocally({
  authCacheService,
  userService
});
```

## Billing Module

Import from `@{your-app-name}/billing/utils`.

### Billing Cache Service

The billing cache provides a typed caching layer for subscriptions, features, and plans.

**Interface:**

```typescript
interface BillingCacheService {
  getCachedSubscription(organizationId: string): Promise<SubscriptionCacheData | null>;
  setCachedSubscription(organizationId: string, data: SubscriptionCacheData): Promise<void>;
  getCachedFeatures(organizationId: string): Promise<string[] | null>;
  setCachedFeatures(organizationId: string, features: string[]): Promise<void>;
  getCachedPlan(planId: string): Promise<PlanCacheData | null>;
  setCachedPlan(planId: string, plan: PlanCacheData): Promise<void>;
}
```

**Factory:**

```typescript
import { createBillingCacheService } from '@{your-app-name}/billing/utils';

const billingCache = createBillingCacheService(redisCache); // accepts a TtlCache instance

await billingCache.setCachedSubscription(orgId, subscriptionData);
const sub = await billingCache.getCachedSubscription(orgId);

await billingCache.setCachedFeatures(orgId, ['custom_domains', 'auto_scaling']);
const features = await billingCache.getCachedFeatures(orgId);

await billingCache.setCachedPlan(planId, planData);
const plan = await billingCache.getCachedPlan(planId);
```

### Surfacing Functions

Billing surfacing functions resolve subscription and feature data for an organization. The billing module provides remote surfacing only -- there are no local surfacing variants.

```typescript
import {
  createSurfaceSubscription,
  createSurfaceFeatures,
  validateActiveSubscription,
  validateRequiredFeatures
} from '@{your-app-name}/billing/utils';

const surfaceSubscription = await createSurfaceSubscription({
  billingCacheService,
  billingUrl: process.env.BILLING_URL
});

const surfaceFeatures = await createSurfaceFeatures({
  billingCacheService,
  billingUrl: process.env.BILLING_URL
});
```

**Validation helpers:**

```typescript
const subscriptionCheck = validateActiveSubscription(options);
const featureCheck = validateRequiredFeatures(options);
```

### Feature Flags

```typescript
import { FEATURE_FLAGS } from '@{your-app-name}/billing/utils';
```

```typescript
const FEATURE_FLAGS = {
  CUSTOM_DOMAINS: 'custom_domains',
  AUTO_SCALING: 'auto_scaling',
  ADVANCED_OBSERVABILITY: 'advanced_observability',
  API_VERSIONING: 'api_versioning',
  MULTI_REGION: 'multi_region',
  PRIVATE_NETWORKING: 'private_networking',
  CUSTOM_BLUEPRINTS: 'custom_blueprints',
  COMPLIANCE: 'compliance',
  SSO_INTEGRATION: 'sso_integration',
} as const;
```

### Plan Configuration

**BillingPlanEnum:**

```typescript
const BillingPlanEnum = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
} as const;
```

**Plan feature and limit mappings:**

| Constant | Type | Description |
|----------|------|-------------|
| `PLAN_FEATURES` | `Record<string, string[]>` | Maps plan names (free, pro, enterprise) to their feature slugs |
| `PLAN_LIMITS` | `Record<string, ResourceLimits>` | Maps plan names to resource limits (maxEnvironments, maxServices, maxWorkers, maxMonthlyDeployments) |
| `PRO_FEATURES` | `Set<string>` | Set of features available on the pro plan |
| `ENTERPRISE_FEATURES` | `Set<string>` | Set of features available on the enterprise plan |

### Helper Functions

```typescript
import {
  getFeaturesForPlan,
  getLimitsForPlan,
  isPlanFeatureAvailable,
  hasRequiredFeatures,
  getMissingFeatures,
  featureSetToArray
} from '@{your-app-name}/billing/utils';
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `getFeaturesForPlan` | `(planName: string) => string[]` | Returns the list of feature slugs for a given plan |
| `getLimitsForPlan` | `(planName: string) => ResourceLimits` | Returns the resource limits for a given plan |
| `isPlanFeatureAvailable` | `(planName: string, featureSlug: string) => boolean` | Checks whether a specific feature is available on a plan |
| `hasRequiredFeatures` | `(required: string[], available: Set<string>) => boolean` | Checks whether all required features are present in the available set |
| `getMissingFeatures` | `(required: string[], available: Set<string>) => string[]` | Returns the list of required features not found in the available set |
| `featureSetToArray` | `(features: Set<string>) => string[]` | Converts a feature set to an array |

## Server Integration

Combine IAM and Billing surfacing functions when configuring your server:

```typescript
import { forklaunchExpress } from '@forklaunch/express';
import { createSurfaceRoles, createSurfacePermissions, createAuthCacheService } from '@{your-app-name}/iam/utils';
import { createSurfaceFeatures, createBillingCacheService } from '@{your-app-name}/billing/utils';

const authCacheService = createAuthCacheService(redisCache);
const billingCacheService = createBillingCacheService(redisCache);

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

const app = forklaunchExpress(schemaValidator, telemetry, {
  auth: {
    mapRoles: surfaceRoles,
    mapPermissions: surfacePermissions,
    mapFeatures: surfaceFeatures
  }
});
```

## Protecting Routes

Use RBAC constants and feature flags in route contract definitions:

```typescript
import { PLATFORM_ADMIN_ROLES } from '@{your-app-name}/iam/utils';
import { FEATURE_FLAGS } from '@{your-app-name}/billing/utils';

export const protectedRoute = handlers.get(
  schemaValidator,
  '/admin/dashboard',
  {
    name: 'getAdminDashboard',
    auth: {
      method: 'jwt',
      allowedRoles: PLATFORM_ADMIN_ROLES,
      requiredFeatures: [FEATURE_FLAGS.ADVANCED_OBSERVABILITY]
    },
    responses: { 200: DashboardSchema }
  },
  async (req, res) => {
    // Only admins with the advanced_observability feature can access
  }
);
```

## Best Practices

1. **Use role sets, not individual role strings.** The hierarchical sets (`PLATFORM_ADMIN_ROLES`, etc.) include all roles at that level and above, so access checks work correctly without manually listing every role.

2. **Use remote surfacing from external services, local surfacing from within the IAM service.** Remote surfacing calls the IAM service over HTTP. Local surfacing accesses the database directly and is only appropriate when running inside the IAM service itself. The billing module only has remote surfacing.

3. **Reference feature flags as constants.** Always use `FEATURE_FLAGS.CUSTOM_DOMAINS` rather than the raw string `'custom_domains'` to avoid typos and enable refactoring.

4. **Cache services handle TTL automatically.** Both `createAuthCacheService` and `createBillingCacheService` accept a `TtlCache` instance and manage cache expiration internally. You do not need to set TTLs manually.
