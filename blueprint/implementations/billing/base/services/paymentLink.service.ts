import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { PaymentLinkService } from '@forklaunch/interfaces-billing/interfaces';
import {
  CreatePaymentLinkDto,
  PaymentLinkDto,
  UpdatePaymentLinkDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';

export class BasePaymentLinkService<
  SchemaValidator extends AnySchemaValidator,
  CurrencyEnum,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    PaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
    CreatePaymentLinkDtoMapper: CreatePaymentLinkDto<CurrencyEnum>;
    UpdatePaymentLinkDtoMapper: UpdatePaymentLinkDto<CurrencyEnum>;
  } = {
    PaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
    CreatePaymentLinkDtoMapper: CreatePaymentLinkDto<CurrencyEnum>;
    UpdatePaymentLinkDtoMapper: UpdatePaymentLinkDto<CurrencyEnum>;
  },
  Entities extends {
    PaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
    CreatePaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
    UpdatePaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
  } = {
    PaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
    CreatePaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
    UpdatePaymentLinkDtoMapper: PaymentLinkDto<CurrencyEnum>;
  }
> implements PaymentLinkService<CurrencyEnum>
{
  #mapperss: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mapperss>,
    Entities,
    Dto
  >;

  constructor(
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mapperss: {
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
    }
  ) {
    this.#mapperss = transformIntoInternalDtoMapper(mapperss, schemaValidator);
  }

  protected cacheKeyPrefix = 'payment_link';
  protected createCacheKey = createCacheKey(this.cacheKeyPrefix);

  async createPaymentLink(
    paymentLinkDto: Dto['CreatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    // TODO: Perform permission checks here
    const paymentLink =
      this.#mapperss.CreatePaymentLinkDtoMapper.deserializeDtoToEntity(
        paymentLinkDto
      );
    await this.cache.putRecord({
      key: this.createCacheKey(paymentLink.id),
      value: paymentLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#mapperss.PaymentLinkDtoMapper.serializeEntityToDto(
      paymentLink
    );
  }

  async updatePaymentLink(
    paymentLinkDto: Dto['UpdatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    const cacheKey = this.createCacheKey(paymentLinkDto.id);
    const existingLink =
      await this.cache.readRecord<Entities['PaymentLinkDtoMapper']>(cacheKey);
    if (!existingLink) {
      throw new Error('Payment link not found');
    }
    const paymentLink =
      this.#mapperss.UpdatePaymentLinkDtoMapper.deserializeDtoToEntity(
        paymentLinkDto
      );
    const updatedLink = { ...existingLink, ...paymentLink };
    await this.cache.putRecord({
      key: cacheKey,
      value: updatedLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#mapperss.PaymentLinkDtoMapper.serializeEntityToDto(
      updatedLink
    );
  }

  async getPaymentLink({ id }: IdDto): Promise<Dto['PaymentLinkDtoMapper']> {
    const cacheKey = this.createCacheKey(id);
    const paymentLink =
      await this.cache.readRecord<Entities['PaymentLinkDtoMapper']>(cacheKey);
    if (!paymentLink) {
      throw new Error('Payment link not found');
    }

    return this.#mapperss.PaymentLinkDtoMapper.serializeEntityToDto(
      paymentLink.value
    );
  }

  async expirePaymentLink({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Payment link expired', { id });
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentSuccess({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Payment link success', { id });
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentFailure({ id }: IdDto): Promise<void> {
    this.openTelemetryCollector.info('Payment link failure', { id });
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async listPaymentLinks(
    idsDto?: IdsDto
  ): Promise<Dto['PaymentLinkDtoMapper'][]> {
    const keys =
      idsDto?.ids.map((id) => this.createCacheKey(id)) ??
      (await this.cache.listKeys(this.cacheKeyPrefix));

    return await Promise.all(
      keys.map(async (key) => {
        const paymentLink =
          await this.cache.readRecord<Entities['PaymentLinkDtoMapper']>(key);
        const paymentLinkDto =
          this.#mapperss.PaymentLinkDtoMapper.serializeEntityToDto(
            paymentLink.value
          );
        return paymentLinkDto;
      })
    );
  }
}
