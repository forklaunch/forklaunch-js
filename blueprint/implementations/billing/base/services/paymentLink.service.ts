import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { PaymentLinkService } from '@forklaunch/interfaces-billing/interfaces';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { BasePaymentLinkDtos } from '../types/baseBillingDto.types';
import { BasePaymentLinkEntities } from '../types/baseBillingEntity.types';

export class BasePaymentLinkService<
  SchemaValidator extends AnySchemaValidator,
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum,
  Entities extends BasePaymentLinkEntities<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >,
  Dto extends BasePaymentLinkDtos<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  > = BasePaymentLinkDtos<PaymentMethodEnum, CurrencyEnum, StatusEnum>
> implements PaymentLinkService<PaymentMethodEnum, CurrencyEnum, StatusEnum>
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  protected evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  protected enableDatabaseBackup: boolean;

  constructor(
    protected readonly em: EntityManager,
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      PaymentLinkMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['PaymentLinkMapper'],
        Entities['PaymentLinkMapper']
      >;
      CreatePaymentLinkMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreatePaymentLinkMapper'],
        Entities['CreatePaymentLinkMapper'],
        (
          dto: Dto['CreatePaymentLinkMapper'],
          em: EntityManager
        ) => Promise<Entities['CreatePaymentLinkMapper']>
      >;
      UpdatePaymentLinkMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdatePaymentLinkMapper'],
        Entities['UpdatePaymentLinkMapper'],
        (
          dto: Dto['UpdatePaymentLinkMapper'],
          em: EntityManager
        ) => Promise<Entities['UpdatePaymentLinkMapper']>
      >;
    },
    readonly options?: {
      enableDatabaseBackup?: boolean;
      telemetry?: TelemetryOptions;
    }
  ) {
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

  protected cacheKeyPrefix = 'payment_link';
  protected createCacheKey = createCacheKey(this.cacheKeyPrefix);

  async createPaymentLink(
    paymentLinkDto: Dto['CreatePaymentLinkMapper']
  ): Promise<Dto['PaymentLinkMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating payment link', paymentLinkDto);
    }

    const paymentLink =
      await this._mappers.CreatePaymentLinkMapper.deserializeDtoToEntity(
        paymentLinkDto,
        this.em
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush(paymentLink);
    }

    const createdPaymentLinkDto =
      await this._mappers.PaymentLinkMapper.serializeEntityToDto(paymentLink);

    await this.cache.putRecord({
      key: this.createCacheKey(createdPaymentLinkDto.id),
      value: createdPaymentLinkDto,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return createdPaymentLinkDto;
  }

  async updatePaymentLink(
    paymentLinkDto: Dto['UpdatePaymentLinkMapper']
  ): Promise<Dto['PaymentLinkMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating payment link', paymentLinkDto);
    }

    const cacheKey = this.createCacheKey(paymentLinkDto.id);
    const existingLink = (
      await this.cache.readRecord<Entities['PaymentLinkMapper']>(cacheKey)
    )?.value;
    if (!existingLink) {
      throw new Error('Payment link not found');
    }
    const paymentLink =
      await this._mappers.UpdatePaymentLinkMapper.deserializeDtoToEntity(
        paymentLinkDto,
        this.em
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush(paymentLink);
    }

    const updatedLinkDto = {
      ...existingLink,
      ...(await this._mappers.PaymentLinkMapper.serializeEntityToDto(
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

  async getPaymentLink({ id }: IdDto): Promise<Dto['PaymentLinkMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting payment link', { id });
    }
    const cacheKey = this.createCacheKey(id);
    const paymentLink =
      await this.cache.readRecord<Entities['PaymentLinkMapper']>(cacheKey);
    if (!paymentLink) {
      throw new Error('Payment link not found');
    }

    return this._mappers.PaymentLinkMapper.serializeEntityToDto(
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

  async listPaymentLinks(idsDto?: IdsDto): Promise<Dto['PaymentLinkMapper'][]> {
    const keys =
      idsDto?.ids.map((id) => this.createCacheKey(id)) ??
      (await this.cache.listKeys(this.cacheKeyPrefix));

    return Promise.all(
      keys.map(async (key) => {
        const paymentLink =
          await this.cache.readRecord<Entities['PaymentLinkMapper']>(key);
        const paymentLinkDto =
          this._mappers.PaymentLinkMapper.serializeEntityToDto(
            paymentLink.value
          );
        return paymentLinkDto;
      })
    );
  }
}
