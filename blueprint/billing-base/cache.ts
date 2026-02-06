/**
 * Billing Cache Entry Point
 * Exports only cache service - no entities, no MikroORM discovery
 */

import type { ResourceLimits } from '@forklaunch/blueprint-core';

export interface BillingCacheLike {
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

    // Feature caching methods
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

    // Entitlement caching methods
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
