import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { CheckoutSessionService } from '@forklaunch/interfaces-billing/interfaces';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { BaseCheckoutSessionDtos } from '../domain/types/baseBillingDto.types';
import { BaseCheckoutSessionEntities } from '../domain/types/baseBillingEntity.types';

export class BaseCheckoutSessionService<
  SchemaValidator extends AnySchemaValidator,
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum,
  Entities extends BaseCheckoutSessionEntities<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >,
  Dto extends BaseCheckoutSessionDtos<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  > = BaseCheckoutSessionDtos<PaymentMethodEnum, CurrencyEnum, StatusEnum>
> implements CheckoutSessionService<PaymentMethodEnum, CurrencyEnum, StatusEnum>
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  protected evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  protected enableDatabaseBackup: boolean;
  protected readonly em: EntityManager;
  protected readonly cache: TtlCache;
  protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected readonly schemaValidator: SchemaValidator;
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
        em: EntityManager
      ) => Promise<Entities['CreateCheckoutSessionMapper']>
    >;
    UpdateCheckoutSessionMapper: RequestMapperConstructor<
      SchemaValidator,
      Dto['UpdateCheckoutSessionMapper'],
      Entities['UpdateCheckoutSessionMapper'],
      (
        dto: Dto['UpdateCheckoutSessionMapper'],
        em: EntityManager
      ) => Promise<Entities['UpdateCheckoutSessionMapper']>
    >;
  };

  constructor(
    em: EntityManager,
    cache: TtlCache,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: {
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
          em: EntityManager
        ) => Promise<Entities['CreateCheckoutSessionMapper']>
      >;
      UpdateCheckoutSessionMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdateCheckoutSessionMapper'],
        Entities['UpdateCheckoutSessionMapper'],
        (
          dto: Dto['UpdateCheckoutSessionMapper'],
          em: EntityManager
        ) => Promise<Entities['UpdateCheckoutSessionMapper']>
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    this.em = em;
    this.cache = cache;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.enableDatabaseBackup = options?.enableDatabaseBackup ?? false;
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  protected createCacheKey = createCacheKey('checkout_session');

  async createCheckoutSession(
    checkoutSessionDto: Dto['CreateCheckoutSessionMapper']
  ): Promise<Dto['CheckoutSessionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating checkout session',
        checkoutSessionDto
      );
    }

    const checkoutSession =
      await this._mappers.CreateCheckoutSessionMapper.deserializeDtoToEntity(
        checkoutSessionDto,
        this.em
      );

    const createdCheckoutSessionDto =
      await this._mappers.CheckoutSessionMapper.serializeEntityToDto(
        checkoutSession
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush(checkoutSession);
    }

    await this.cache.putRecord({
      key: this.createCacheKey(createdCheckoutSessionDto.id),
      value: createdCheckoutSessionDto,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return createdCheckoutSessionDto;
  }

  async getCheckoutSession({
    id
  }: IdDto): Promise<Dto['CheckoutSessionMapper']> {
    const checkoutSessionDetails = await this.cache.readRecord<
      Entities['CheckoutSessionMapper']
    >(this.createCacheKey(id));
    if (!checkoutSessionDetails) {
      throw new Error('Session not found');
    }

    return this._mappers.CheckoutSessionMapper.serializeEntityToDto(
      checkoutSessionDetails.value
    );
  }

  async expireCheckoutSession({ id }: IdDto): Promise<void> {
    const checkoutSessionDetails = await this.cache.readRecord(
      this.createCacheKey(id)
    );
    if (!checkoutSessionDetails) {
      throw new Error('Session not found');
    }
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutSuccess({ id }: IdDto): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Checkout success', { id });
    }

    if (this.enableDatabaseBackup) {
      const checkoutSession = await this.em.upsert('CheckoutSession', {
        id,
        status: 'SUCCESS'
      });
      await this.em.persistAndFlush(checkoutSession);
    }

    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handleCheckoutFailure({ id }: IdDto): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Checkout failure', { id });
    }

    if (this.enableDatabaseBackup) {
      const checkoutSession = await this.em.upsert('CheckoutSession', {
        id,
        status: 'FAILED'
      });
      await this.em.persistAndFlush(checkoutSession);
    }

    await this.cache.deleteRecord(this.createCacheKey(id));
  }
}
