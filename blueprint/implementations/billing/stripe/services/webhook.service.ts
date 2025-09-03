import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enum/billingProvider.enum';
import { CurrencyEnum } from '../domain/enum/currency.enum';
import { PaymentMethodEnum } from '../domain/enum/paymentMethod.enum';
import { PlanCadenceEnum } from '../domain/enum/planCadence.enum';
import {
  StripeBillingPortalEntities,
  StripeCheckoutSessionEntities,
  StripePaymentLinkEntities,
  StripePlanEntities,
  StripeSubscriptionEntities
} from '../domain/types/stripe.entity.types';
import { StripeBillingPortalService } from './billingPortal.service';
import { StripeCheckoutSessionService } from './checkoutSession.service';
import { StripePaymentLinkService } from './paymentLink.service';
import { StripePlanService } from './plan.service';
import { StripeSubscriptionService } from './subscription.service';

export class StripeWebhookService<
  SchemaValidator extends AnySchemaValidator,
  StatusEnum,
  PartyEnum,
  BillingPortalEntities extends
    StripeBillingPortalEntities = StripeBillingPortalEntities,
  CheckoutSessionEntities extends
    StripeCheckoutSessionEntities<StatusEnum> = StripeCheckoutSessionEntities<StatusEnum>,
  PaymentLinkEntities extends
    StripePaymentLinkEntities<StatusEnum> = StripePaymentLinkEntities<StatusEnum>,
  PlanEntities extends StripePlanEntities = StripePlanEntities,
  SubscriptionEntities extends
    StripeSubscriptionEntities<PartyEnum> = StripeSubscriptionEntities<PartyEnum>
> {
  protected readonly stripeClient: Stripe;
  protected readonly em: EntityManager;
  protected readonly schemaValidator: SchemaValidator;
  protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected readonly billingPortalService: StripeBillingPortalService<
    SchemaValidator,
    BillingPortalEntities
  >;
  protected readonly checkoutSessionService: StripeCheckoutSessionService<
    SchemaValidator,
    StatusEnum,
    CheckoutSessionEntities
  >;
  protected readonly paymentLinkService: StripePaymentLinkService<
    SchemaValidator,
    StatusEnum,
    PaymentLinkEntities
  >;
  protected readonly planService: StripePlanService<
    SchemaValidator,
    PlanEntities
  >;
  protected readonly subscriptionService: StripeSubscriptionService<
    SchemaValidator,
    PartyEnum,
    SubscriptionEntities
  >;

  constructor(
    stripeClient: Stripe,
    em: EntityManager,
    schemaValidator: SchemaValidator,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    billingPortalService: StripeBillingPortalService<
      SchemaValidator,
      BillingPortalEntities
    >,
    checkoutSessionService: StripeCheckoutSessionService<
      SchemaValidator,
      StatusEnum,
      CheckoutSessionEntities
    >,
    paymentLinkService: StripePaymentLinkService<
      SchemaValidator,
      StatusEnum,
      PaymentLinkEntities
    >,
    planService: StripePlanService<SchemaValidator, PlanEntities>,
    subscriptionService: StripeSubscriptionService<
      SchemaValidator,
      PartyEnum,
      SubscriptionEntities
    >
  ) {
    this.stripeClient = stripeClient;
    this.em = em;
    this.schemaValidator = schemaValidator;
    this.openTelemetryCollector = openTelemetryCollector;
    this.billingPortalService = billingPortalService;
    this.checkoutSessionService = checkoutSessionService;
    this.paymentLinkService = paymentLinkService;
    this.planService = planService;
    this.subscriptionService = subscriptionService;
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    if (this.openTelemetryCollector) {
      this.openTelemetryCollector.info('Handling webhook event', event);
    }
    const eventType = event.type;

    switch (eventType) {
      case 'billing_portal.session.created': {
        this.billingPortalService.baseBillingPortalService.createBillingPortalSession(
          {
            id: event.data.object.id,
            customerId: event.data.object.customer,
            expiresAt: new Date(event.data.object.created + 5 * 60 * 1000),
            uri: event.data.object.url
          }
        );
        break;
      }

      case 'checkout.session.expired': {
        this.checkoutSessionService.handleCheckoutFailure({
          id: event.data.object.id
        });
        break;
      }

      case 'checkout.session.completed': {
        this.checkoutSessionService.handleCheckoutSuccess({
          id: event.data.object.id
        });
        break;
      }

      case 'payment_link.created':
        {
          this.paymentLinkService.basePaymentLinkService.createPaymentLink({
            id: event.data.object.id,
            amount:
              event.data.object.line_items?.data.reduce<number>(
                (total, item) => total + item.amount_total,
                0
              ) ?? 0,
            paymentMethods: event.data.object
              .payment_method_types as PaymentMethodEnum[],
            status: 'CREATED' as StatusEnum[keyof StatusEnum],
            currency: event.data.object.currency as CurrencyEnum
          });
        }
        break;

      case 'payment_link.updated': {
        this.paymentLinkService.basePaymentLinkService.updatePaymentLink({
          id: event.data.object.id,
          amount:
            event.data.object.line_items?.data.reduce<number>(
              (total, item) => total + item.amount_total,
              0
            ) ?? 0,
          paymentMethods: event.data.object
            .payment_method_types as PaymentMethodEnum[],
          status: 'UPDATED' as StatusEnum[keyof StatusEnum],
          currency: event.data.object.currency as CurrencyEnum
        });
        break;
      }

      case 'plan.created': {
        if (
          typeof event.data.object.product === 'object' &&
          event.data.object.product != null &&
          event.data.object.amount != null
        ) {
          this.planService.basePlanService.createPlan({
            id: event.data.object.id,
            billingProvider: BillingProviderEnum.STRIPE,
            cadence: event.data.object.interval as PlanCadenceEnum,
            currency: event.data.object.currency as CurrencyEnum,
            active: true,
            name:
              typeof event.data.object.product === 'string'
                ? event.data.object.product
                : event.data.object.product?.id,
            price: event.data.object.amount,
            externalId: event.data.object.id
          });
        } else {
          throw new Error('Invalid plan');
        }
        break;
      }

      case 'plan.updated': {
        if (
          typeof event.data.object.product === 'object' &&
          event.data.object.product != null &&
          event.data.object.amount != null
        ) {
          this.planService.basePlanService.updatePlan({
            id: event.data.object.id,
            billingProvider: BillingProviderEnum.STRIPE,
            cadence: event.data.object.interval as PlanCadenceEnum,
            currency: event.data.object.currency as CurrencyEnum,
            active: true,
            name:
              typeof event.data.object.product === 'string'
                ? event.data.object.product
                : event.data.object.product?.id,
            price: event.data.object.amount,
            externalId: event.data.object.id
          });
        } else {
          throw new Error('Invalid plan');
        }
        break;
      }

      case 'plan.deleted': {
        this.planService.deletePlan({
          id: event.data.object.id
        });
        break;
      }

      case 'customer.subscription.created': {
        this.subscriptionService.baseSubscriptionService.createSubscription({
          id: event.data.object.id,
          partyId:
            typeof event.data.object.customer === 'string'
              ? event.data.object.customer
              : event.data.object.customer.id,
          partyType: 'USER' as PartyEnum[keyof PartyEnum],
          description: event.data.object.description ?? undefined,
          active: true,
          productId: event.data.object.items.data[0].plan.id,
          externalId: event.data.object.id,
          billingProvider: BillingProviderEnum.STRIPE,
          startDate: new Date(event.data.object.created),
          endDate: event.data.object.cancel_at
            ? new Date(event.data.object.cancel_at)
            : new Date(Infinity),
          status: event.data.object.status
        });
        break;
      }

      case 'customer.subscription.updated': {
        this.subscriptionService.baseSubscriptionService.updateSubscription({
          id: event.data.object.id,
          partyId:
            typeof event.data.object.customer === 'string'
              ? event.data.object.customer
              : event.data.object.customer.id,
          partyType: 'USER' as PartyEnum[keyof PartyEnum],
          description: event.data.object.description ?? undefined,
          active: true,
          externalId: event.data.object.id,
          billingProvider: BillingProviderEnum.STRIPE,
          startDate: new Date(event.data.object.created),
          endDate: event.data.object.cancel_at
            ? new Date(event.data.object.cancel_at)
            : new Date(Infinity),
          productId: event.data.object.items.data[0].plan.id,
          status: event.data.object.status
        });
        break;
      }

      case 'customer.subscription.deleted': {
        this.subscriptionService.deleteSubscription({
          id: event.data.object.id
        });
        break;
      }

      case 'customer.subscription.paused': {
        this.subscriptionService.cancelSubscription({
          id: event.data.object.id
        });
        break;
      }

      case 'customer.subscription.resumed': {
        this.subscriptionService.resumeSubscription({
          id: event.data.object.id
        });
        break;
      }

      default:
        this.openTelemetryCollector.info(
          'Unprocessed stripe event type',
          eventType
        );
        break;
    }
  }
}
