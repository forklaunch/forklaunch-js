/**
 * Billing Plan Enum
 * Standard billing plan tiers for ForkLaunch applications
 */

export const BillingPlanEnum = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
} as const;

export type BillingPlan =
  (typeof BillingPlanEnum)[keyof typeof BillingPlanEnum];
