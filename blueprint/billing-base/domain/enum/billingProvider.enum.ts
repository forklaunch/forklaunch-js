export const BillingProviderEnum = {
  NONE: 'none',
  STRIPE: 'stripe',
  ADYEN: 'adyen'
} as const;
export type BillingProviderEnum =
  (typeof BillingProviderEnum)[keyof typeof BillingProviderEnum];
