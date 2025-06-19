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
  BillingPortalDtoMapper: BillingPortalDto;
  CreateBillingPortalDtoMapper: CreateBillingPortalDto;
  UpdateBillingPortalDtoMapper: UpdateBillingPortalDto;
};

// checkout session dto types
export type BaseCheckoutSessionDtos = {
  CheckoutSessionDtoMapper: CheckoutSessionDto;
  CreateCheckoutSessionDtoMapper: CreateCheckoutSessionDto;
  UpdateCheckoutSessionDtoMapper: UpdateCheckoutSessionDto;
};

// payment link dto types
export type BasePaymentLinkDtos = {
  PaymentLinkDtoMapper: PaymentLinkDto;
  CreatePaymentLinkDtoMapper: CreatePaymentLinkDto;
  UpdatePaymentLinkDtoMapper: UpdatePaymentLinkDto;
};

// plan dto types
export type BasePlanDtos = {
  PlanDtoMapper: PlanDto;
  CreatePlanDtoMapper: CreatePlanDto;
  UpdatePlanDtoMapper: UpdatePlanDto;
};

// subscription dto types
export type BaseSubscriptionDtos = {
  SubscriptionDtoMapper: SubscriptionDto;
  CreateSubscriptionDtoMapper: CreateSubscriptionDto;
  UpdateSubscriptionDtoMapper: UpdateSubscriptionDto;
};
