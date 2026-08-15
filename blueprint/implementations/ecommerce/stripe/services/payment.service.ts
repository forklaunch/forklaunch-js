import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BasePaymentService } from '@forklaunch/implementation-ecommerce-base/services';
import {
  BasePaymentDtos,
  BasePaymentEntities
} from '@forklaunch/implementation-ecommerce-base/types';
import { PaymentService } from '@forklaunch/interfaces-ecommerce/interfaces';
import {
  ConfirmPaymentDto,
  CreatePaymentDto,
  FailPaymentDto
} from '@forklaunch/interfaces-ecommerce/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { StripePaymentMappers } from '../domain/types/payment.mapper.types';

/**
 * Wraps BasePaymentService with real Stripe PaymentIntent calls — the base
 * does DB persistence, this class calls the provider API and delegates
 * persistence back to base (same split as StripePlanService/BasePlanService
 * in billing). Fills the payment seam: PaymentIntent drives the order
 * toward paid; confirmation is idempotent and driven by the webhook.
 */
export class StripePaymentService<
  SchemaValidator extends AnySchemaValidator,
  Entities extends BasePaymentEntities,
  Dto extends BasePaymentDtos = BasePaymentDtos
> implements PaymentService
{
  basePaymentService: BasePaymentService<SchemaValidator, Entities, Dto>;
  protected readonly stripeClient: Stripe;
  protected readonly em: EntityManager;
  protected readonly connect?: {
    connectedAccountId: string;
    platformFeeBps: number;
  };

  constructor(
    stripeClient: Stripe,
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: StripePaymentMappers<Entities, Dto>,
    options?: {
      telemetry?: TelemetryOptions;
      /**
       * Stripe Connect (platform) mode. When set, PaymentIntents are created
       * as DIRECT charges on the merchant's connected account — the merchant
       * is the merchant of record and settles the funds — with
       * `application_fee_amount` computed from platformFeeBps. The launch
       * business model is NO markup (fee 0, see the Guild deck: "payments
       * flat at launch"), so platformFeeBps defaults to 0 and the fee is
       * omitted entirely; it exists as a dial, not a revenue assumption.
       * When absent, behavior is unchanged: the deploy's own STRIPE_API_KEY
       * account is the merchant (bring-your-own-key mode).
       */
      connect?: {
        connectedAccountId: string;
        platformFeeBps?: number;
      };
    }
  ) {
    this.stripeClient = stripeClient;
    this.em = em;
    if (options?.connect) {
      // Validate the fee dial here rather than trusting the caller: it comes
      // from an env var, and every bad value fails SILENTLY downstream
      // otherwise. A non-numeric STRIPE_PLATFORM_FEE_BPS makes Number()
      // return NaN, `feeCents > 0` is then false, and the application fee is
      // quietly omitted — an operator who meant to charge a fee would get
      // none, with nothing logged. A negative value does the same. Failing
      // at construction turns a silent misconfiguration into a startup error.
      const platformFeeBps = options.connect.platformFeeBps ?? 0;
      if (
        !Number.isInteger(platformFeeBps) ||
        platformFeeBps < 0 ||
        platformFeeBps > 10000
      ) {
        throw new Error(
          `Invalid Stripe platform fee: expected an integer between 0 and 10000 basis points, got ${platformFeeBps}. ` +
            'Check STRIPE_PLATFORM_FEE_BPS.'
        );
      }
      this.connect = {
        connectedAccountId: options.connect.connectedAccountId,
        platformFeeBps
      };
    }
    // CreatePaymentMapper.toEntity's 3rd param is concretely Stripe.PaymentIntent
    // here (narrower than base's generic ...args: unknown[]) — safe at runtime,
    // this cast just satisfies the base constructor's looser declared type.
    this.basePaymentService = new BasePaymentService(
      em,
      openTelemetryCollector,
      schemaValidator,
      mappers as unknown as ConstructorParameters<
        typeof BasePaymentService<SchemaValidator, Entities, Dto>
      >[3],
      options
    );
  }

  /**
   * Creates the Stripe PaymentIntent, then persists the pending record with
   * its id as providerRef. The PaymentIntent's `client_secret` is bolted
   * onto the returned DTO (never persisted — Payment has no clientSecret
   * column, deliberately: it's a one-time, provider-issued credential the
   * frontend needs *right now* to actually collect the charge via
   * Stripe.js, not something that should still be fetchable from GET
   * /payment/:id later). This widens the return type over the
   * PaymentService interface's `Promise<Params['PaymentDto']>` — a covariant,
   * backward-compatible narrowing (an intersection type is always assignable
   * to its base), the same relationship StripePaymentMappers already has to
   * the base PaymentMappers for this class's mapper argument.
   */
  async createPayment(
    paymentDto: CreatePaymentDto,
    em?: EntityManager
  ): Promise<Dto['PaymentMapper'] & { clientSecret?: string }> {
    // In Connect mode this is a DIRECT charge: created on the merchant's
    // connected account (stripeAccount request option), so the merchant is
    // merchant-of-record and keeps the funds. The platform fee is only
    // attached when non-zero — at launch it always is zero (no markup).
    const feeCents = this.connect
      ? Math.round((paymentDto.amountCents * this.connect.platformFeeBps) / 10000)
      : 0;
    const paymentIntent = await this.stripeClient.paymentIntents.create(
      {
        amount: paymentDto.amountCents,
        currency: paymentDto.currency,
        metadata: { orderId: paymentDto.orderId },
        ...(this.connect && feeCents > 0
          ? { application_fee_amount: feeCents }
          : {})
      },
      this.connect
        ? { stripeAccount: this.connect.connectedAccountId }
        : undefined
    );
    const payment = await this.basePaymentService.createPayment(
      paymentDto,
      em ?? this.em,
      paymentIntent
    );
    return {
      ...payment,
      clientSecret: paymentIntent.client_secret ?? undefined
    };
  }

  async getPayment(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<Dto['PaymentMapper']> {
    return this.basePaymentService.getPayment(idDto, em);
  }

  /** Driven by the Stripe webhook (signature-verified at the controller layer) — idempotent. */
  async confirmPayment(
    confirmDto: ConfirmPaymentDto,
    em?: EntityManager
  ): Promise<Dto['PaymentMapper']> {
    return this.basePaymentService.confirmPayment(confirmDto, em);
  }

  /** Failed payment emits the event dunning hooks into, at the deployable-app layer. */
  async failPayment(
    failDto: FailPaymentDto,
    em?: EntityManager
  ): Promise<Dto['PaymentMapper']> {
    return this.basePaymentService.failPayment(failDto, em);
  }
}
