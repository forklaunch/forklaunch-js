import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import {
  BaseBillingPortalService,
  BaseCheckoutSessionService,
  BasePaymentLinkService,
  BasePlanService,
  BaseSubscriptionService
} from '@forklaunch/implementation-billing-base/services';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { BillingProviderEnum } from '../domain/enums/billingProvider.enum';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import { PlanCadenceEnum } from '../domain/enums/planCadence.enum';

export class StripeWebhookService<
  SchemaValidator extends AnySchemaValidator,
  StatusEnum,
  PartyEnum
> {
  constructor(
    protected readonly stripeClient: Stripe,
    protected readonly em: EntityManager,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected readonly billingPortalService: BaseBillingPortalService<SchemaValidator>,
    protected readonly checkoutSessionService: BaseCheckoutSessionService<
      SchemaValidator,
      typeof PaymentMethodEnum,
      typeof CurrencyEnum,
      StatusEnum
    >,
    protected readonly paymentLinkService: BasePaymentLinkService<
      SchemaValidator,
      typeof PaymentMethodEnum,
      typeof CurrencyEnum,
      StatusEnum
    >,
    protected readonly planService: BasePlanService<
      SchemaValidator,
      typeof PlanCadenceEnum,
      typeof CurrencyEnum,
      typeof BillingProviderEnum
    >,
    protected readonly subscriptionService: BaseSubscriptionService<
      SchemaValidator,
      PartyEnum,
      typeof BillingProviderEnum
    >
  ) {}

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    if (this.openTelemetryCollector) {
      this.openTelemetryCollector.info('Handling webhook event', event);
    }
    const eventType = event.type;

    switch (eventType) {
      case 'billing_portal.session.created': {
        this.billingPortalService.createBillingPortalSession({
          id: event.data.object.id,
          customerId: event.data.object.customer,
          expiresAt: new Date(event.data.object.created + 5 * 60 * 1000),
          uri: event.data.object.url,
          providerFields: event.data.object
        });
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
          this.paymentLinkService.createPaymentLink({
            id: event.data.object.id,
            amount:
              event.data.object.line_items?.data.reduce<number>(
                (total, item) => total + item.amount_total,
                0
              ) ?? 0,
            paymentMethods: event.data.object
              .payment_method_types as PaymentMethodEnum[],
            status: 'CREATED' as StatusEnum[keyof StatusEnum],
            currency: event.data.object.currency as CurrencyEnum,
            providerFields: event.data.object
          });
        }
        break;

      case 'payment_link.updated': {
        this.paymentLinkService.updatePaymentLink({
          id: event.data.object.id,
          amount:
            event.data.object.line_items?.data.reduce<number>(
              (total, item) => total + item.amount_total,
              0
            ) ?? 0,
          paymentMethods: event.data.object
            .payment_method_types as PaymentMethodEnum[],
          status: 'UPDATED' as StatusEnum[keyof StatusEnum],
          currency: event.data.object.currency as CurrencyEnum,
          providerFields: event.data.object
        });
        break;
      }

      case 'plan.created': {
        if (
          typeof event.data.object.product === 'object' &&
          event.data.object.product != null &&
          event.data.object.amount != null
        ) {
          this.planService.createPlan({
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
            externalId: event.data.object.id,
            providerFields: event.data.object
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
          this.planService.updatePlan({
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
            externalId: event.data.object.id,
            providerFields: event.data.object
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
        this.subscriptionService.createSubscription({
          id: event.data.object.id,
          partyId:
            typeof event.data.object.customer === 'string'
              ? event.data.object.customer
              : event.data.object.customer.id,
          partyType: 'USER' as PartyEnum[keyof PartyEnum],
          description: event.data.object.description ?? undefined,
          active: true,
          productId: event.data.object.items.data[0].plan.id,
          providerFields: event.data.object,
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
        this.subscriptionService.updateSubscription({
          id: event.data.object.id,
          partyId:
            typeof event.data.object.customer === 'string'
              ? event.data.object.customer
              : event.data.object.customer.id,
          description: event.data.object.description ?? undefined,
          active: true,
          providerFields: event.data.object,
          externalId: event.data.object.id,
          billingProvider: BillingProviderEnum.STRIPE,
          startDate: new Date(event.data.object.created),
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
