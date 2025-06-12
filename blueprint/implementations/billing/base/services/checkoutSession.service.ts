import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import { CheckoutSessionService } from '@forklaunch/interfaces-billing/interfaces';
import {
  CheckoutSessionDto,
  CreateCheckoutSessionDto,
  UpdateCheckoutSessionDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BaseCheckoutSessionService<
  SchemaValidator extends AnySchemaValidator,
  PaymentMethodEnum,
  StatusEnum,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum, StatusEnum>;
    CreateCheckoutSessionDtoMapper: CreateCheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
    UpdateCheckoutSessionDtoMapper: UpdateCheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
  } = {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum, StatusEnum>;
    CreateCheckoutSessionDtoMapper: CreateCheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
    UpdateCheckoutSessionDtoMapper: UpdateCheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
  },
  Entities extends {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum, StatusEnum>;
    CreateCheckoutSessionDtoMapper: CheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
    UpdateCheckoutSessionDtoMapper: CheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
  } = {
    CheckoutSessionDtoMapper: CheckoutSessionDto<PaymentMethodEnum, StatusEnum>;
    CreateCheckoutSessionDtoMapper: CheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
    UpdateCheckoutSessionDtoMapper: CheckoutSessionDto<
      PaymentMethodEnum,
      StatusEnum
    >;
  }
> implements CheckoutSessionService<PaymentMethodEnum, StatusEnum>
{
  #mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>,
    Entities,
    Dto
  >;
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  private enableDatabaseBackup: boolean;

  constructor(
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
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
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
    checkoutSessionDto: Dto['CreateCheckoutSessionDtoMapper']
  ): Promise<Dto['CheckoutSessionDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating checkout session',
        checkoutSessionDto
      );
    }

    const checkoutSession =
      await this.#mappers.CreateCheckoutSessionDtoMapper.deserializeDtoToEntity(
        checkoutSessionDto,
        this.em
      );

    const createdCheckoutSessionDto =
      await this.#mappers.CheckoutSessionDtoMapper.serializeEntityToDto(
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
  }: IdDto): Promise<Dto['CheckoutSessionDtoMapper']> {
    const checkoutSessionDetails = await this.cache.readRecord<
      Entities['CheckoutSessionDtoMapper']
    >(this.createCacheKey(id));
    if (!checkoutSessionDetails) {
      throw new Error('Session not found');
    }

    return this.#mappers.CheckoutSessionDtoMapper.serializeEntityToDto(
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
