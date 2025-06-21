import {
  BillingPortalDto,
  CheckoutSessionDto,
  PaymentLinkDto,
  PlanDto,
  SubscriptionDto
} from '@forklaunch/interfaces-billing/types';

// billing entity types
export type BaseBillingEntities = {
  BillingPortalMapper: BillingPortalDto;
  CreateBillingPortalMapper: BillingPortalDto;
  UpdateBillingPortalMapper: BillingPortalDto;
};

// checkout session entity types
export type BaseCheckoutSessionEntities<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = {
  CheckoutSessionMapper: CheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  CreateCheckoutSessionMapper: CheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  UpdateCheckoutSessionMapper: CheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
};

// payment link entity types
export type BasePaymentLinkEntities<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = {
  PaymentLinkMapper: PaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  CreatePaymentLinkMapper: PaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  UpdatePaymentLinkMapper: PaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
};

// plan entity types
export type BasePlanEntities<
  PlanCadenceEnum,
  CurrencyEnum,
  BillingProviderEnum
> = {
  PlanMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
  CreatePlanMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
  UpdatePlanMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
};

// subscription entity types
export type BaseSubscriptionEntities<PartyType, BillingProviderType> = {
  SubscriptionMapper: SubscriptionDto<PartyType, BillingProviderType>;
  CreateSubscriptionMapper: SubscriptionDto<PartyType, BillingProviderType>;
  UpdateSubscriptionMapper: SubscriptionDto<PartyType, BillingProviderType>;
};
