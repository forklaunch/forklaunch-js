import {
  CreatePaymentLinkDto,
  PaymentLinkDto,
  UpdatePaymentLinkDto
} from '../models/dtoMapper/paymentLink.dtoMapper';
import {
  CreatePlanDto,
  PlanDto,
  UpdatePlanDto
} from '../models/dtoMapper/plan.dtoMapper';
import {
  CreateSessionDto,
  SessionDto
} from '../models/dtoMapper/session.dtoMapper';
import {
  CreateSubscriptionDto,
  SubscriptionDto,
  UpdateSubscriptionDto
} from '../models/dtoMapper/subscription.dtoMapper';

// Rename this to billing service
export interface BillingService {
  // This is for a single plan, store this in table
  createPlan: (planDto: CreatePlanDto) => Promise<PlanDto>;
  getPlan: (id: string) => Promise<PlanDto>;
  updatePlan: (planDto: UpdatePlanDto) => Promise<PlanDto>;
  deletePlan: (id: string) => Promise<void>;
  listPlans: (ids?: string[]) => Promise<PlanDto[]>;

  // for generating external links
  // store in cache, for permissions
  createCheckoutSession: (sessionDto: CreateSessionDto) => Promise<SessionDto>;
  getCheckoutSession: (id: string) => Promise<SessionDto>;
  expireCheckoutSession: (id: string) => Promise<void>;

  handleCheckoutSuccess: (id: string) => Promise<void>;
  handleCheckoutFailure: (id: string) => Promise<void>;

  // TODO:
  // for generating external links
  // store in cache, for permissions
  // createBillingPortalSession: (billingPortalDto: CreateBillingPortalDto) => Promise<BillingPortalDto>;
  // getBillingPortalSession: (id: string) => Promise<BillingPortalDto>;
  // expireBillingPortalSession: (id: string) => Promise<void>;

  // for one off products that are not part of a subscription
  // think about how permissions work on payment links, but these should be ephemeral
  // store in cache, for permissions
  createPaymentLink: (
    paymentLink: CreatePaymentLinkDto
  ) => Promise<PaymentLinkDto>;
  // invalidates payment link
  updatePaymentLink: (
    paymentLink: UpdatePaymentLinkDto
  ) => Promise<PaymentLinkDto>;
  // get metadata about the payment link
  getPaymentLink: (id: string) => Promise<PaymentLinkDto>;
  // admin API, make sure that permissions are correct here
  listPaymentLinks: (ids?: string[]) => Promise<PaymentLinkDto[]>;

  // store this in a table

  createSubscription: (
    subscriptionDto: CreateSubscriptionDto
  ) => Promise<SubscriptionDto>;
  getSubscription: (id: string) => Promise<SubscriptionDto>;
  getUserSubscription: (id: string) => Promise<SubscriptionDto>;
  getOrganizationSubscription: (id: string) => Promise<SubscriptionDto>;
  updateSubscription: (
    subscriptionDto: UpdateSubscriptionDto
  ) => Promise<SubscriptionDto>;
  deleteSubscription: (id: string) => Promise<void>;
  listSubscriptions: (ids?: string[]) => Promise<SubscriptionDto[]>;
  cancelSubscription: (id: string) => Promise<void>;
  resumeSubscription: (id: string) => Promise<void>;
}
