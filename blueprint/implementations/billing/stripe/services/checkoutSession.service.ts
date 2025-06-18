import { IdDto } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import {
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor
} from '@forklaunch/core/mappers';
import { BaseCheckoutSessionService } from '@forklaunch/implementation-billing-base/services';
import { CheckoutSessionService } from '@forklaunch/interfaces-billing/interfaces';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import {
  StripeCheckoutSessionDto,
  StripeCreateCheckoutSessionDto,
  StripeUpdateCheckoutSessionDto
} from '../types/stripe.dto.types';
import { StripeCheckoutSessionEntity } from '../types/stripe.entity.types';

export class StripeCheckoutSessionService<
    SchemaValidator extends AnySchemaValidator,
    StatusEnum,
    Metrics extends MetricsDefinition = MetricsDefinition,
    Dto extends {
      CheckoutSessionDtoMapper: StripeCheckoutSessionDto<StatusEnum>;
      CreateCheckoutSessionDtoMapper: StripeCreateCheckoutSessionDto<StatusEnum>;
      UpdateCheckoutSessionDtoMapper: StripeUpdateCheckoutSessionDto<StatusEnum>;
    } = {
      CheckoutSessionDtoMapper: StripeCheckoutSessionDto<StatusEnum>;
      CreateCheckoutSessionDtoMapper: StripeCreateCheckoutSessionDto<StatusEnum>;
      UpdateCheckoutSessionDtoMapper: StripeUpdateCheckoutSessionDto<StatusEnum>;
    },
    Entities extends {
      CheckoutSessionDtoMapper: StripeCheckoutSessionEntity<StatusEnum>;
      CreateCheckoutSessionDtoMapper: StripeCheckoutSessionEntity<StatusEnum>;
      UpdateCheckoutSessionDtoMapper: StripeCheckoutSessionEntity<StatusEnum>;
    } = {
      CheckoutSessionDtoMapper: StripeCheckoutSessionEntity<StatusEnum>;
      CreateCheckoutSessionDtoMapper: StripeCheckoutSessionEntity<StatusEnum>;
      UpdateCheckoutSessionDtoMapper: StripeCheckoutSessionEntity<StatusEnum>;
    }
  >
  extends BaseCheckoutSessionService<
    SchemaValidator,
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum,
    Metrics,
    Dto,
    Entities
  >
  implements
    CheckoutSessionService<
      typeof PaymentMethodEnum,
      typeof CurrencyEnum,
      StatusEnum,
      {
        CreateCheckoutSessionDto: Dto['CreateCheckoutSessionDtoMapper'];
        CheckoutSessionDto: Dto['CheckoutSessionDtoMapper'];
        IdDto: IdDto;
      }
    >
{
  constructor(
    protected readonly stripeClient: Stripe,
    protected readonly em: EntityManager,
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      CheckoutSessionDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['CheckoutSessionDtoMapper'],
        Entities['CheckoutSessionDtoMapper']
      >;
      CreateCheckoutSessionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateCheckoutSessionDtoMapper'],
        Entities['CreateCheckoutSessionDtoMapper']
      >;
      UpdateCheckoutSessionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateCheckoutSessionDtoMapper'],
        Entities['UpdateCheckoutSessionDtoMapper']
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    super(em, cache, openTelemetryCollector, schemaValidator, mappers, options);
  }

  async createCheckoutSession(
    checkoutSessionDto: Dto['CreateCheckoutSessionDtoMapper']
  ): Promise<Dto['CheckoutSessionDtoMapper']> {
    const session = await this.stripeClient.checkout.sessions.create({
      ...checkoutSessionDto.stripeFields,
      payment_method_types: checkoutSessionDto.paymentMethods,
      currency: checkoutSessionDto.currency as string,
      success_url: checkoutSessionDto.successRedirectUri,
      cancel_url: checkoutSessionDto.cancelRedirectUri
    });
    return super.createCheckoutSession({
      ...checkoutSessionDto,
      id: session.id,
      uri: session.url,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      providerFields: session
    });
  }

  async getCheckoutSession({
    id
  }: IdDto): Promise<Dto['CheckoutSessionDtoMapper']> {
    const databaseCheckoutSession = await super.getCheckoutSession({ id });
    return {
      ...databaseCheckoutSession,
      stripeFields: await this.stripeClient.checkout.sessions.retrieve(id)
    };
  }

  async expireCheckoutSession({ id }: IdDto): Promise<void> {
    await this.stripeClient.checkout.sessions.expire(id);
    await super.expireCheckoutSession({ id });
  }

  async handleCheckoutSuccess({ id }: IdDto): Promise<void> {
    await this.stripeClient.checkout.sessions.update(id, {
      metadata: {
        status: 'SUCCESS'
      }
    });
    await super.handleCheckoutSuccess({ id });
  }

  async handleCheckoutFailure({ id }: IdDto): Promise<void> {
    await this.stripeClient.checkout.sessions.update(id, {
      metadata: {
        status: 'FAILED'
      }
    });
    await super.handleCheckoutFailure({ id });
  }
}
