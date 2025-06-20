import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BaseCheckoutSessionService } from '@forklaunch/implementation-billing-base/services';
import { CheckoutSessionService } from '@forklaunch/interfaces-billing/interfaces';
import {
  IdentityRequestMapper,
  IdentityResponseMapper,
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CurrencyEnum } from '../domain/enums/currency.enum';
import { PaymentMethodEnum } from '../domain/enums/paymentMethod.enum';
import { StripeCheckoutSessionDtos } from '../types/stripe.dto.types';
import { StripeCheckoutSessionEntities } from '../types/stripe.entity.types';

export class StripeCheckoutSessionService<
  SchemaValidator extends AnySchemaValidator,
  StatusEnum,
  Entities extends StripeCheckoutSessionEntities<StatusEnum>,
  Dto extends
    StripeCheckoutSessionDtos<StatusEnum> = StripeCheckoutSessionDtos<StatusEnum>
> implements
    CheckoutSessionService<
      typeof PaymentMethodEnum,
      typeof CurrencyEnum,
      StatusEnum,
      {
        CreateCheckoutSessionDto: Dto['CreateCheckoutSessionMapper'];
        CheckoutSessionDto: Dto['CheckoutSessionMapper'];
        IdDto: IdDto;
      }
    >
{
  baseCheckoutSessionService: BaseCheckoutSessionService<
    SchemaValidator,
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum,
    Entities,
    Entities
  >;
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;

  constructor(
    protected readonly stripeClient: Stripe,
    protected readonly em: EntityManager,
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      CheckoutSessionMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['CheckoutSessionMapper'],
        Entities['CheckoutSessionMapper']
      >;
      CreateCheckoutSessionMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreateCheckoutSessionMapper'],
        Entities['CreateCheckoutSessionMapper'],
        (
          dto: Dto['CreateCheckoutSessionMapper'],
          em: EntityManager,
          session: Stripe.Checkout.Session
        ) => Promise<Entities['CreateCheckoutSessionMapper']>
      >;
      UpdateCheckoutSessionMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdateCheckoutSessionMapper'],
        Entities['UpdateCheckoutSessionMapper'],
        (
          dto: Dto['UpdateCheckoutSessionMapper'],
          em: EntityManager,
          session: Stripe.Checkout.Session
        ) => Promise<Entities['UpdateCheckoutSessionMapper']>
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.baseCheckoutSessionService = new BaseCheckoutSessionService(
      em,
      cache,
      openTelemetryCollector,
      schemaValidator,
      {
        CheckoutSessionMapper: IdentityResponseMapper<
          Entities['CheckoutSessionMapper']
        >,
        CreateCheckoutSessionMapper: IdentityRequestMapper<
          Entities['CreateCheckoutSessionMapper']
        >,
        UpdateCheckoutSessionMapper: IdentityRequestMapper<
          Entities['UpdateCheckoutSessionMapper']
        >
      },
      options
    );
  }

  async createCheckoutSession(
    checkoutSessionDto: Dto['CreateCheckoutSessionMapper']
  ): Promise<Dto['CheckoutSessionMapper']> {
    const session = await this.stripeClient.checkout.sessions.create({
      ...checkoutSessionDto.stripeFields,
      payment_method_types: checkoutSessionDto.paymentMethods,
      currency: checkoutSessionDto.currency as string,
      success_url: checkoutSessionDto.successRedirectUri,
      cancel_url: checkoutSessionDto.cancelRedirectUri
    });

    const checkoutSessionEntity =
      await this.baseCheckoutSessionService.createCheckoutSession(
        await this._mappers.CreateCheckoutSessionMapper.deserializeDtoToEntity(
          {
            ...checkoutSessionDto,
            id: session.id,
            uri: session.url,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            providerFields: session
          },
          this.em,
          session
        )
      );

    return this._mappers.CheckoutSessionMapper.serializeEntityToDto(
      checkoutSessionEntity
    );
  }

  async getCheckoutSession({
    id
  }: IdDto): Promise<Dto['CheckoutSessionMapper']> {
    const databaseCheckoutSession =
      await this.baseCheckoutSessionService.getCheckoutSession({ id });
    return {
      ...this._mappers.CheckoutSessionMapper.serializeEntityToDto(
        databaseCheckoutSession
      ),
      stripeFields: await this.stripeClient.checkout.sessions.retrieve(id)
    };
  }

  async expireCheckoutSession({ id }: IdDto): Promise<void> {
    await this.stripeClient.checkout.sessions.expire(id);
    await this.baseCheckoutSessionService.expireCheckoutSession({ id });
  }

  async handleCheckoutSuccess({ id }: IdDto): Promise<void> {
    await this.stripeClient.checkout.sessions.update(id, {
      metadata: {
        status: 'SUCCESS'
      }
    });
    await this.baseCheckoutSessionService.handleCheckoutSuccess({ id });
  }

  async handleCheckoutFailure({ id }: IdDto): Promise<void> {
    await this.stripeClient.checkout.sessions.update(id, {
      metadata: {
        status: 'FAILED'
      }
    });
    await this.baseCheckoutSessionService.handleCheckoutFailure({ id });
  }
}
