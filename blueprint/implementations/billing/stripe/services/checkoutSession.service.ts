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
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
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
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends
    StripeCheckoutSessionDtos<StatusEnum> = StripeCheckoutSessionDtos<StatusEnum>,
  Entities extends
    StripeCheckoutSessionEntities<StatusEnum> = StripeCheckoutSessionEntities<StatusEnum>
> implements
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
  baseCheckoutSessionService: BaseCheckoutSessionService<
    SchemaValidator,
    typeof PaymentMethodEnum,
    typeof CurrencyEnum,
    StatusEnum,
    Metrics,
    Entities,
    Entities
  >;
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>
  >;

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
        Entities['CreateCheckoutSessionDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['CreateCheckoutSessionDtoMapper'],
          em?: EntityManager,
          session?: Stripe.Checkout.Session
        ) => Promise<Entities['CreateCheckoutSessionDtoMapper']>
      >;
      UpdateCheckoutSessionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateCheckoutSessionDtoMapper'],
        Entities['UpdateCheckoutSessionDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['UpdateCheckoutSessionDtoMapper'],
          em?: EntityManager,
          session?: Stripe.Checkout.Session
        ) => Promise<Entities['UpdateCheckoutSessionDtoMapper']>
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.baseCheckoutSessionService = new BaseCheckoutSessionService(
      em,
      cache,
      openTelemetryCollector,
      schemaValidator,
      {
        CheckoutSessionDtoMapper: IdentityResponseMapper<
          Entities['CheckoutSessionDtoMapper'],
          SchemaValidator
        >,
        CreateCheckoutSessionDtoMapper: IdentityRequestMapper<
          Entities['CreateCheckoutSessionDtoMapper'],
          SchemaValidator
        >,
        UpdateCheckoutSessionDtoMapper: IdentityRequestMapper<
          Entities['UpdateCheckoutSessionDtoMapper'],
          SchemaValidator
        >
      },
      options
    );
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

    const checkoutSessionEntity =
      await this.baseCheckoutSessionService.createCheckoutSession(
        await this._mappers.CreateCheckoutSessionDtoMapper.deserializeDtoToEntity(
          this.schemaValidator,
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

    return this._mappers.CheckoutSessionDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      checkoutSessionEntity
    );
  }

  async getCheckoutSession({
    id
  }: IdDto): Promise<Dto['CheckoutSessionDtoMapper']> {
    const databaseCheckoutSession =
      await this.baseCheckoutSessionService.getCheckoutSession({ id });
    return {
      ...this._mappers.CheckoutSessionDtoMapper.serializeEntityToDto(
        this.schemaValidator,
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
