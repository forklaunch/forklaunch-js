export const BillingProviderEnum = {
  STRIPE: 'stripe'
} as const;
export type BillingProviderEnum =
  (typeof BillingProviderEnum)[keyof typeof BillingProviderEnum];
