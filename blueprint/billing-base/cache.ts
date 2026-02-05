/**
 * Billing Cache Entry Point
 * Exports only cache service - no entities, no MikroORM discovery
 */

import type { ResourceLimits } from '@forklaunch/blueprint-core/feature-flags';

export type BillingCacheLike = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

export type SubscriptionCacheData = {
  planName: string;
  status: string;
  features: string[];
};

export type PlanCacheData = {
  id: string;
  name: string;
  features: string[];
};

/**
 * Entitlement cache data - represents cached feature access for a party
 */
export type EntitlementCacheData = {
  features: string[];
  limits: ResourceLimits;
  syncedAt: Date;
  source: 'db' | 'external';
};

export type BillingCacheService = {
  // Subscription caching
  getCachedSubscription: (
    organizationId: string
  ) => Promise<SubscriptionCacheData | null>;
  setCachedSubscription: (
    organizationId: string,
    data: SubscriptionCacheData
  ) => Promise<void>;
  deleteCachedSubscription: (organizationId: string) => Promise<void>;

  // Plan caching
  getCachedPlan: (planId: string) => Promise<PlanCacheData | null>;
  setCachedPlan: (planId: string, data: PlanCacheData) => Promise<void>;

  // Feature caching (for surfacing logic)
  getCachedFeatures: (organizationId: string) => Promise<Set<string> | null>;
  setCachedFeatures: (
    organizationId: string,
    features: Set<string>
  ) => Promise<void>;

  // Entitlement caching (for surfacing logic)
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
      const data = await cache.get(`${SUBSCRIPTION_PREFIX}${organizationId}`);
      return data as SubscriptionCacheData | null;
    },
    async setCachedSubscription(
      organizationId: string,
      data: SubscriptionCacheData
    ) {
      await cache.set(`${SUBSCRIPTION_PREFIX}${organizationId}`, data, TTL);
    },
    async deleteCachedSubscription(organizationId: string) {
      await cache.delete(`${SUBSCRIPTION_PREFIX}${organizationId}`);
    },
    async getCachedPlan(planId: string) {
      const data = await cache.get(`${PLAN_PREFIX}${planId}`);
      return data as PlanCacheData | null;
    },
    async setCachedPlan(planId: string, data: PlanCacheData) {
      await cache.set(`${PLAN_PREFIX}${planId}`, data, TTL);
    },

    // Feature caching methods
    async getCachedFeatures(organizationId: string) {
      const data = await cache.get(`${FEATURE_PREFIX}${organizationId}`);
      if (data && Array.isArray(data)) {
        return new Set<string>(data);
      }
      return null;
    },
    async setCachedFeatures(organizationId: string, features: Set<string>) {
      await cache.set(
        `${FEATURE_PREFIX}${organizationId}`,
        Array.from(features),
        TTL
      );
    },

    // Entitlement caching methods
    async getCachedEntitlements(partyKey: string) {
      const data = await cache.get(`${ENTITLEMENT_PREFIX}${partyKey}`);
      if (data) {
        // Restore Date object from serialization
        const entitlement = data as EntitlementCacheData;
        if (typeof entitlement.syncedAt === 'string') {
          entitlement.syncedAt = new Date(entitlement.syncedAt);
        }
        return entitlement;
      }
      return null;
    },
    async setCachedEntitlements(partyKey: string, data: EntitlementCacheData) {
      await cache.set(`${ENTITLEMENT_PREFIX}${partyKey}`, data, TTL);
    },
    async deleteCachedEntitlements(partyKey: string) {
      await cache.delete(`${ENTITLEMENT_PREFIX}${partyKey}`);
    }
  };
}
