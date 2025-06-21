import {
  BillingPortalDto,
  CheckoutSessionDto,
  CreateBillingPortalDto,
  CreateCheckoutSessionDto,
  CreatePaymentLinkDto,
  CreatePlanDto,
  CreateSubscriptionDto,
  PaymentLinkDto,
  PlanDto,
  SubscriptionDto,
  UpdateBillingPortalDto,
  UpdateCheckoutSessionDto,
  UpdatePaymentLinkDto,
  UpdatePlanDto,
  UpdateSubscriptionDto
} from '@forklaunch/interfaces-billing/types';

// billing dto types
export type BaseBillingDtos = {
  BillingPortalMapper: BillingPortalDto;
  CreateBillingPortalMapper: CreateBillingPortalDto;
  UpdateBillingPortalMapper: UpdateBillingPortalDto;
};

// checkout session dto types
export type BaseCheckoutSessionDtos<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum
> = {
  CheckoutSessionMapper: CheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  CreateCheckoutSessionMapper: CreateCheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  UpdateCheckoutSessionMapper: UpdateCheckoutSessionDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
};

// payment link dto types
export type BasePaymentLinkDtos<PaymentMethodEnum, CurrencyEnum, StatusEnum> = {
  PaymentLinkMapper: PaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  CreatePaymentLinkMapper: CreatePaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
  UpdatePaymentLinkMapper: UpdatePaymentLinkDto<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >;
};

// plan dto types
export type BasePlanDtos<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum> = {
  PlanMapper: PlanDto<PlanCadenceEnum, CurrencyEnum, BillingProviderEnum>;
  CreatePlanMapper: CreatePlanDto<
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  >;
  UpdatePlanMapper: UpdatePlanDto<
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  >;
};

// subscription dto types
export type BaseSubscriptionDtos<PartyType, BillingProviderType> = {
  SubscriptionMapper: SubscriptionDto<PartyType, BillingProviderType>;
  CreateSubscriptionMapper: CreateSubscriptionDto<
    PartyType,
    BillingProviderType
  >;
  UpdateSubscriptionMapper: UpdateSubscriptionDto<
    PartyType,
    BillingProviderType
  >;
};
