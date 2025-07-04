export const PaymentMethodEnum = {
  ACH: 'ach',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  WIRE: 'wire',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  PAYPAL: 'paypal'
} as const;
export type PaymentMethodEnum =
  (typeof PaymentMethodEnum)[keyof typeof PaymentMethodEnum];
