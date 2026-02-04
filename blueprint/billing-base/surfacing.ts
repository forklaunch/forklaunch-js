import type { BillingCacheService, SubscriptionCacheData } from './cache';

export { generateHmacAuthHeaders } from '@forklaunch/core/http';

export type SubscriptionData = SubscriptionCacheData;

/**
 * Create a surfaceSubscription function that fetches organization subscription data
 * from billing cache (populated by webhook events).
 */
export async function createSurfaceSubscription(params: {
  billingCacheService: BillingCacheService;
  billingUrl: string;
}): Promise<
  (payload: { organizationId?: string }) => Promise<SubscriptionData | null>
> {
  const { billingCacheService } = params;

  return async (payload: { organizationId?: string }) => {
    if (!payload.organizationId) {
      return null;
    }

    const cached = await billingCacheService.getCachedSubscription(
      payload.organizationId
    );
    return cached;
  };
}

/**
 * Create a surfaceFeatures function that fetches organization feature flags
 * from billing cache (populated by webhook events).
 */
export async function createSurfaceFeatures(params: {
  billingCacheService: BillingCacheService;
  billingUrl: string;
}): Promise<(payload: { organizationId?: string }) => Promise<Set<string>>> {
  const { billingCacheService } = params;

  return async (payload: { organizationId?: string }) => {
    if (!payload.organizationId) {
      return new Set<string>();
    }

    const cached = await billingCacheService.getCachedFeatures(
      payload.organizationId
    );
    return cached ?? new Set<string>();
  };
}

/**
 * Create a surfaceSubscription function that fetches subscription data
 * from local database via subscription service and caches results.
 */
export function createSurfaceSubscriptionLocally(params: {
  billingCacheService: BillingCacheService;
  subscriptionService: {
    getActiveSubscription: (params: {
      organizationId: string;
    }) => Promise<SubscriptionData | null>;
  };
}): (payload: { organizationId?: string }) => Promise<SubscriptionData | null> {
  const { billingCacheService, subscriptionService } = params;

  return async (payload: { organizationId?: string }) => {
    if (!payload.organizationId) {
      return null;
    }

    const cached = await billingCacheService.getCachedSubscription(
      payload.organizationId
    );
    if (cached) {
      return cached;
    }

    try {
      const subscription = await subscriptionService.getActiveSubscription({
        organizationId: payload.organizationId
      });

      if (subscription) {
        await billingCacheService.setCachedSubscription(
          payload.organizationId,
          subscription
        );
      }

      return subscription;
    } catch (error) {
      console.error('Failed to surface subscription locally:', error);
      return null;
    }
  };
}

/**
 * Create a surfaceFeatures function that fetches feature flags
 * from local database via subscription service and caches results.
 */
export function createSurfaceFeaturesLocally(params: {
  billingCacheService: BillingCacheService;
  subscriptionService: {
    getFeatures: (params: { organizationId: string }) => Promise<string[]>;
  };
}): (payload: { organizationId?: string }) => Promise<Set<string>> {
  const { billingCacheService, subscriptionService } = params;

  return async (payload: { organizationId?: string }) => {
    if (!payload.organizationId) {
      return new Set<string>();
    }

    const cached = await billingCacheService.getCachedFeatures(
      payload.organizationId
    );
    if (cached) {
      return cached;
    }

    try {
      const featuresArray = await subscriptionService.getFeatures({
        organizationId: payload.organizationId
      });
      const features = new Set<string>(featuresArray);
      await billingCacheService.setCachedFeatures(
        payload.organizationId,
        features
      );
      return features;
    } catch (error) {
      console.error('Failed to surface features locally:', error);
      return new Set<string>();
    }
  };
}

/**
 * Validates if organization has all required features.
 */
export function validateRequiredFeatures(
  requiredFeatures: string[],
  availableFeatures: Set<string>
): { allowed: boolean; missingFeatures: string[] } {
  const missingFeatures = requiredFeatures.filter(
    (feature) => !availableFeatures.has(feature)
  );

  return {
    allowed: missingFeatures.length === 0,
    missingFeatures
  };
}

/**
 * Validates if organization has an active subscription.
 */
export function validateActiveSubscription(
  subscription: SubscriptionData | null
): {
  allowed: boolean;
  reason?: 'NO_SUBSCRIPTION' | 'INACTIVE';
} {
  if (!subscription) {
    return { allowed: false, reason: 'NO_SUBSCRIPTION' };
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') {
    return { allowed: false, reason: 'INACTIVE' };
  }

  return { allowed: true };
}
