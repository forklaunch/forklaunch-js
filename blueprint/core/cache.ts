/**
 * Consolidated Cache Services
 * Redis-based caching for auth and billing data
 * Shared across all services to reduce cross-module calls
 */

import { ResourceLimits } from './feature-flags';

// ─── Common Cache Interface ───────────────────────────────────────────────────

export interface CacheLike {
  readRecord<T>(key: string): Promise<{ value: T }>;
  putRecord<T>(record: {
    key: string;
    value: T;
    ttlMilliseconds: number;
  }): Promise<void>;
  deleteRecord(key: string): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
  deleteBatchRecords(keys: string[]): Promise<void>;
}

// ─── Auth Cache ───────────────────────────────────────────────────────────────

export interface AuthCacheService {
  getCachedRoles(userId: string): Promise<Set<string> | null>;
  setCachedRoles(userId: string, roles: Set<string>): Promise<void>;
  getCachedPermissions(userId: string): Promise<Set<string> | null>;
  setCachedPermissions(userId: string, permissions: Set<string>): Promise<void>;
  deleteCachedRoles(userId: string): Promise<void>;
  deleteCachedPermissions(userId: string): Promise<void>;
  deleteAllCachedData(userId: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  getCachedOrganizationRoles(organizationId: string): Promise<string[] | null>;
  setCachedOrganizationRoles(
    organizationId: string,
    roles: string[]
  ): Promise<void>;
  deleteCachedOrganizationRoles(organizationId: string): Promise<void>;
}

export function createAuthCacheService(cache: CacheLike): AuthCacheService {
  const ROLES_CACHE_PREFIX = 'auth:roles:';
  const PERMISSIONS_CACHE_PREFIX = 'auth:permissions:';
  const ORG_ROLES_CACHE_PREFIX = 'auth:org-roles:';
  const TTL = 60 * 60 * 1000; // 1 hour

  return {
    async getCachedRoles(userId: string) {
      try {
        const result = await cache.readRecord<string[]>(
          `${ROLES_CACHE_PREFIX}${userId}`
        );
        return new Set(result.value);
      } catch {
        return null;
      }
    },

    async setCachedRoles(userId: string, roles: Set<string>) {
      await cache.putRecord({
        key: `${ROLES_CACHE_PREFIX}${userId}`,
        value: Array.from(roles),
        ttlMilliseconds: TTL
      });
    },

    async getCachedPermissions(userId: string) {
      try {
        const result = await cache.readRecord<string[]>(
          `${PERMISSIONS_CACHE_PREFIX}${userId}`
        );
        return new Set(result.value);
      } catch {
        return null;
      }
    },

    async setCachedPermissions(userId: string, permissions: Set<string>) {
      await cache.putRecord({
        key: `${PERMISSIONS_CACHE_PREFIX}${userId}`,
        value: Array.from(permissions),
        ttlMilliseconds: TTL
      });
    },

    async deleteCachedRoles(userId: string) {
      await cache.deleteRecord(`${ROLES_CACHE_PREFIX}${userId}`);
    },

    async deleteCachedPermissions(userId: string) {
      await cache.deleteRecord(`${PERMISSIONS_CACHE_PREFIX}${userId}`);
    },

    async deleteAllCachedData(userId: string) {
      await this.deleteCachedRoles(userId);
      await this.deleteCachedPermissions(userId);
    },

    async deleteByPrefix(prefix: string) {
      const keys = await cache.listKeys(prefix);
      if (keys.length > 0) {
        await cache.deleteBatchRecords(keys);
      }
    },

    async getCachedOrganizationRoles(organizationId: string) {
      try {
        const result = await cache.readRecord<string[]>(
          `${ORG_ROLES_CACHE_PREFIX}${organizationId}`
        );
        return result.value;
      } catch {
        return null;
      }
    },

    async setCachedOrganizationRoles(organizationId: string, roles: string[]) {
      await cache.putRecord({
        key: `${ORG_ROLES_CACHE_PREFIX}${organizationId}`,
        value: roles,
        ttlMilliseconds: TTL
      });
    },

    async deleteCachedOrganizationRoles(organizationId: string) {
      await cache.deleteRecord(`${ORG_ROLES_CACHE_PREFIX}${organizationId}`);
    }
  };
}

// ─── Billing Cache ────────────────────────────────────────────────────────────

export type BillingCacheLike = CacheLike;

export type SubscriptionCacheData = {
  subscriptionId: string;
  planId: string;
  planName: string;
  status: string;
  currentPeriodEnd: Date;
  features: string[];
};

export type PlanCacheData = {
  id: string;
  name: string;
  features: string[];
};

export type EntitlementCacheData = {
  features: string[];
  limits: ResourceLimits;
  syncedAt: Date;
  source: 'db' | 'external';
};

export type BillingCacheService = {
  getCachedSubscription: (
    organizationId: string
  ) => Promise<SubscriptionCacheData | null>;
  setCachedSubscription: (
    organizationId: string,
    data: SubscriptionCacheData
  ) => Promise<void>;
  deleteCachedSubscription: (organizationId: string) => Promise<void>;
  getCachedPlan: (planId: string) => Promise<PlanCacheData | null>;
  setCachedPlan: (planId: string, data: PlanCacheData) => Promise<void>;
  getCachedFeatures: (organizationId: string) => Promise<Set<string> | null>;
  setCachedFeatures: (
    organizationId: string,
    features: Set<string>
  ) => Promise<void>;
  getCachedEntitlements: (
    partyKey: string
  ) => Promise<EntitlementCacheData | null>;
  setCachedEntitlements: (
    partyKey: string,
    data: EntitlementCacheData
  ) => Promise<void>;
  deleteCachedEntitlements: (partyKey: string) => Promise<void>;
};

export function createBillingCacheService(
  cache: BillingCacheLike
): BillingCacheService {
  const SUBSCRIPTION_PREFIX = 'billing:subscription:';
  const PLAN_PREFIX = 'billing:plan:';
  const FEATURE_PREFIX = 'billing:features:';
  const ENTITLEMENT_PREFIX = 'billing:entitlement:';
  const TTL = 60 * 60 * 1000; // 1 hour

  return {
    async getCachedSubscription(organizationId: string) {
      try {
        const result = await cache.readRecord<SubscriptionCacheData>(
          `${SUBSCRIPTION_PREFIX}${organizationId}`
        );
        const subscription = result.value;
        if (typeof subscription.currentPeriodEnd === 'string') {
          subscription.currentPeriodEnd = new Date(
            subscription.currentPeriodEnd
          );
        }
        return subscription;
      } catch {
        return null;
      }
    },
    async setCachedSubscription(
      organizationId: string,
      data: SubscriptionCacheData
    ) {
      await cache.putRecord({
        key: `${SUBSCRIPTION_PREFIX}${organizationId}`,
        value: data,
        ttlMilliseconds: TTL
      });
    },
    async deleteCachedSubscription(organizationId: string) {
      await cache.deleteRecord(`${SUBSCRIPTION_PREFIX}${organizationId}`);
    },
    async getCachedPlan(planId: string) {
      try {
        const result = await cache.readRecord<PlanCacheData>(
          `${PLAN_PREFIX}${planId}`
        );
        return result.value;
      } catch {
        return null;
      }
    },
    async setCachedPlan(planId: string, data: PlanCacheData) {
      await cache.putRecord({
        key: `${PLAN_PREFIX}${planId}`,
        value: data,
        ttlMilliseconds: TTL
      });
    },
    async getCachedFeatures(organizationId: string) {
      try {
        const result = await cache.readRecord<string[]>(
          `${FEATURE_PREFIX}${organizationId}`
        );
        if (Array.isArray(result.value)) {
          return new Set<string>(result.value);
        }
        return null;
      } catch {
        return null;
      }
    },
    async setCachedFeatures(organizationId: string, features: Set<string>) {
      await cache.putRecord({
        key: `${FEATURE_PREFIX}${organizationId}`,
        value: Array.from(features),
        ttlMilliseconds: TTL
      });
    },
    async getCachedEntitlements(partyKey: string) {
      try {
        const result = await cache.readRecord<EntitlementCacheData>(
          `${ENTITLEMENT_PREFIX}${partyKey}`
        );
        const entitlement = result.value;
        if (typeof entitlement.syncedAt === 'string') {
          entitlement.syncedAt = new Date(entitlement.syncedAt);
        }
        return entitlement;
      } catch {
        return null;
      }
    },
    async setCachedEntitlements(partyKey: string, data: EntitlementCacheData) {
      await cache.putRecord({
        key: `${ENTITLEMENT_PREFIX}${partyKey}`,
        value: data,
        ttlMilliseconds: TTL
      });
    },
    async deleteCachedEntitlements(partyKey: string) {
      await cache.deleteRecord(`${ENTITLEMENT_PREFIX}${partyKey}`);
    }
  };
}
