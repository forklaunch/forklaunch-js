import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
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
import { PaymentLinkService } from '@forklaunch/interfaces-billing/interfaces';
import {
  CreatePaymentLinkDto,
  PaymentLinkDto,
  UpdatePaymentLinkDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BasePaymentLinkService<
  SchemaValidator extends AnySchemaValidator,
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    PaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    CreatePaymentLinkDtoMapper: CreatePaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    UpdatePaymentLinkDtoMapper: UpdatePaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
  } = {
    PaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    CreatePaymentLinkDtoMapper: CreatePaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    UpdatePaymentLinkDtoMapper: UpdatePaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
  },
  Entities extends {
    PaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    CreatePaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    UpdatePaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
  } = {
    PaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    CreatePaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
    UpdatePaymentLinkDtoMapper: PaymentLinkDto<
      PaymentMethodEnum,
      CurrencyEnum,
      StatusEnum
    >;
  }
> implements PaymentLinkService<PaymentMethodEnum, CurrencyEnum, StatusEnum>
{
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>,
    Entities,
    Dto
  >;
  protected evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  protected enableDatabaseBackup: boolean;

  constructor(
    protected readonly em: EntityManager,
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      PaymentLinkDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['PaymentLinkDtoMapper'],
        Entities['PaymentLinkDtoMapper']
      >;
      CreatePaymentLinkDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreatePaymentLinkDtoMapper'],
        Entities['CreatePaymentLinkDtoMapper']
      >;
      UpdatePaymentLinkDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdatePaymentLinkDtoMapper'],
        Entities['UpdatePaymentLinkDtoMapper']
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.enableDatabaseBackup = options?.enableDatabaseBackup ?? false;
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  protected cacheKeyPrefix = 'payment_link';
  protected createCacheKey = createCacheKey(this.cacheKeyPrefix);

  async createPaymentLink(
    paymentLinkDto: Dto['CreatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating payment link', paymentLinkDto);
    }

    const paymentLink =
      await this._mappers.CreatePaymentLinkDtoMapper.deserializeDtoToEntity(
        paymentLinkDto,
        this.em
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush(paymentLink);
    }

    const createdPaymentLinkDto =
      await this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
        paymentLink
      );

    await this.cache.putRecord({
      key: this.createCacheKey(createdPaymentLinkDto.id),
      value: createdPaymentLinkDto,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return createdPaymentLinkDto;
  }

  async updatePaymentLink(
    paymentLinkDto: Dto['UpdatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating payment link', paymentLinkDto);
    }

    const cacheKey = this.createCacheKey(paymentLinkDto.id);
    const existingLink = (
      await this.cache.readRecord<Entities['PaymentLinkDtoMapper']>(cacheKey)
    )?.value;
    if (!existingLink) {
      throw new Error('Payment link not found');
    }
    const paymentLink =
      await this._mappers.UpdatePaymentLinkDtoMapper.deserializeDtoToEntity(
        paymentLinkDto,
        this.em
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush(paymentLink);
    }

    const updatedLinkDto = {
      ...existingLink,
      ...(await this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
        paymentLink
      ))
    };

    await this.cache.putRecord({
      key: cacheKey,
      value: updatedLinkDto,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return updatedLinkDto;
  }

  async getPaymentLink({ id }: IdDto): Promise<Dto['PaymentLinkDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting payment link', { id });
    }
    const cacheKey = this.createCacheKey(id);
    const paymentLink =
      await this.cache.readRecord<Entities['PaymentLinkDtoMapper']>(cacheKey);
    if (!paymentLink) {
      throw new Error('Payment link not found');
    }

    return this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
      paymentLink.value
    );
  }

  async expirePaymentLink({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Payment link expired', { id });

    if (this.enableDatabaseBackup) {
      const paymentLink = await this.em.upsert('PaymentLink', {
        id,
        status: 'EXPIRED'
      });
      await this.em.removeAndFlush(paymentLink);
    }
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentSuccess({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Payment link success', { id });
    if (this.enableDatabaseBackup) {
      const paymentLink = await this.em.upsert('PaymentLink', {
        id,
        status: 'COMPLETED'
      });
      await this.em.removeAndFlush(paymentLink);
    }
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentFailure({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Payment link failure', { id });
    if (this.enableDatabaseBackup) {
      const paymentLink = await this.em.upsert('PaymentLink', {
        id,
        status: 'FAILED'
      });
      await this.em.removeAndFlush(paymentLink);
    }
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async listPaymentLinks(
    idsDto?: IdsDto
  ): Promise<Dto['PaymentLinkDtoMapper'][]> {
    const keys =
      idsDto?.ids.map((id) => this.createCacheKey(id)) ??
      (await this.cache.listKeys(this.cacheKeyPrefix));

    return Promise.all(
      keys.map(async (key) => {
        const paymentLink =
          await this.cache.readRecord<Entities['PaymentLinkDtoMapper']>(key);
        const paymentLinkDto =
          this._mappers.PaymentLinkDtoMapper.serializeEntityToDto(
            paymentLink.value
          );
        return paymentLinkDto;
      })
    );
  }
}
