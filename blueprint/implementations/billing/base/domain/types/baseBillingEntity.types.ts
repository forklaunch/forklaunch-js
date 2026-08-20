import { ResolvedEntity } from '@forklaunch/core/persistence';
import {
  BillingPortal,
  CheckoutSession,
  PaymentLink,
  Plan,
  Subscription
} from '../../persistence/entities';

// billing portal entity types
export type BaseBillingEntities = {
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

// checkout session entity types
export type BaseCheckoutSessionEntities<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = {
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

// payment link entity types
export type BasePaymentLinkEntities<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = {
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

// plan entity types
export type BasePlanEntities<
  PlanCadenceEnum,
  CurrencyEnum,
  BillingProviderEnum
> = {
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

// subscription entity types
export type BaseSubscriptionEntities<PartyType, BillingProviderType> = {
  SubscriptionMapper: {
    '~entity': ResolvedEntity<(typeof Subscription)['~entity']> & {
      partyType: PartyType[keyof PartyType];
      billingProvider:
        | BillingProviderType[keyof BillingProviderType]
        | null
        | undefined;
    };
  };
  CreateSubscriptionMapper: {
    '~entity': ResolvedEntity<(typeof Subscription)['~entity']> & {
      partyType: PartyType[keyof PartyType];
      billingProvider:
        | BillingProviderType[keyof BillingProviderType]
        | null
        | undefined;
    };
  };
  UpdateSubscriptionMapper: {
    '~entity': ResolvedEntity<(typeof Subscription)['~entity']> & {
      partyType: PartyType[keyof PartyType];
      billingProvider:
        | BillingProviderType[keyof BillingProviderType]
        | null
        | undefined;
    };
  };
};
