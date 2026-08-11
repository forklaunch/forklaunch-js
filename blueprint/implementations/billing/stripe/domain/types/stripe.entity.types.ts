import { ResolvedEntity } from '@forklaunch/core/persistence';
import {
  BillingPortal,
  CheckoutSession,
  PaymentLink,
  Plan,
  Subscription
} from '../../persistence/entities';
import {
  BillingProviderEnum,
  CurrencyEnum,
  PaymentMethodEnum,
  PlanCadenceEnum
} from '../enum';

// Billing Portal Types
export type StripeBillingPortalEntities = {
  BillingPortalMapper: {
    '~entity': ResolvedEntity<(typeof BillingPortal)['~entity']>;
  };
  CreateBillingPortalMapper: {
    '~entity': ResolvedEntity<(typeof BillingPortal)['~entity']>;
  };
  UpdateBillingPortalMapper: {
    '~entity': ResolvedEntity<(typeof BillingPortal)['~entity']>;
  };
};

// Checkout Session Types
export type StripeCheckoutSessionEntities<StatusEnum> = {
  CheckoutSessionMapper: {
    '~entity': ResolvedEntity<(typeof CheckoutSession)['~entity']> & {
      paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
      currency: CurrencyEnum[keyof CurrencyEnum];
      status: StatusEnum[keyof StatusEnum];
    };
  };
  CreateCheckoutSessionMapper: {
    '~entity': ResolvedEntity<(typeof CheckoutSession)['~entity']> & {
      paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
      currency: CurrencyEnum[keyof CurrencyEnum];
      status: StatusEnum[keyof StatusEnum];
    };
  };
  UpdateCheckoutSessionMapper: {
    '~entity': ResolvedEntity<(typeof CheckoutSession)['~entity']> & {
      paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
      currency: CurrencyEnum[keyof CurrencyEnum];
      status: StatusEnum[keyof StatusEnum];
    };
  };
};

// Payment Link Types
export type StripePaymentLinkEntities<StatusEnum> = {
  PaymentLinkMapper: {
    '~entity': ResolvedEntity<(typeof PaymentLink)['~entity']> & {
      paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
      currency: CurrencyEnum[keyof CurrencyEnum];
      status: StatusEnum[keyof StatusEnum];
    };
  };
  CreatePaymentLinkMapper: {
    '~entity': ResolvedEntity<(typeof PaymentLink)['~entity']> & {
      paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
      currency: CurrencyEnum[keyof CurrencyEnum];
      status: StatusEnum[keyof StatusEnum];
    };
  };
  UpdatePaymentLinkMapper: {
    '~entity': ResolvedEntity<(typeof PaymentLink)['~entity']> & {
      paymentMethods: PaymentMethodEnum[keyof PaymentMethodEnum][];
      currency: CurrencyEnum[keyof CurrencyEnum];
      status: StatusEnum[keyof StatusEnum];
    };
  };
};

// Plan Types
export type StripePlanEntities = {
  PlanMapper: {
    '~entity': ResolvedEntity<(typeof Plan)['~entity']> & {
      cadence: PlanCadenceEnum[keyof PlanCadenceEnum];
      currency: CurrencyEnum[keyof CurrencyEnum];
      billingProvider:
        | BillingProviderEnum[keyof BillingProviderEnum]
        | null
        | undefined;
    };
  };
  CreatePlanMapper: {
    '~entity': ResolvedEntity<(typeof Plan)['~entity']> & {
      cadence: PlanCadenceEnum[keyof PlanCadenceEnum];
      currency: CurrencyEnum[keyof CurrencyEnum];
      billingProvider:
        | BillingProviderEnum[keyof BillingProviderEnum]
        | null
        | undefined;
    };
  };
  UpdatePlanMapper: {
    '~entity': ResolvedEntity<(typeof Plan)['~entity']> & {
      cadence: PlanCadenceEnum[keyof PlanCadenceEnum];
      currency: CurrencyEnum[keyof CurrencyEnum];
      billingProvider:
        | BillingProviderEnum[keyof BillingProviderEnum]
        | null
        | undefined;
    };
  };
};

// Subscription Types
export type StripeSubscriptionEntities<PartyTypeEnum> = {
  SubscriptionMapper: {
    '~entity': ResolvedEntity<(typeof Subscription)['~entity']> & {
      partyType: PartyTypeEnum[keyof PartyTypeEnum];
      billingProvider:
        | BillingProviderEnum[keyof BillingProviderEnum]
        | null
        | undefined;
    };
  };
  CreateSubscriptionMapper: {
    '~entity': ResolvedEntity<(typeof Subscription)['~entity']> & {
      partyType: PartyTypeEnum[keyof PartyTypeEnum];
      billingProvider:
        | BillingProviderEnum[keyof BillingProviderEnum]
        | null
        | undefined;
    };
  };
  UpdateSubscriptionMapper: {
    '~entity': ResolvedEntity<(typeof Subscription)['~entity']> & {
      partyType: PartyTypeEnum[keyof PartyTypeEnum];
      billingProvider:
        | BillingProviderEnum[keyof BillingProviderEnum]
        | null
        | undefined;
    };
  };
};
