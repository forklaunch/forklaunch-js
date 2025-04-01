import {
  CreatePaymentLinkDto,
  PaymentLinkDto,
  PaymentLinkService,
  PaymentLinkServiceParameters,
  UpdatePaymentLinkDto
} from '@forklaunch/blueprint-billing-interfaces';
import { IdDto, IdsDto, ReturnTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  InternalDtoMapper,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';

export class BasePaymentLinkService<
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
  SchemaDefinition!: PaymentLinkServiceParameters<CurrencyEnum>;
  #dtoMappers: InternalDtoMapper<
    ReturnTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly dtoMappers: {
      PaymentLinkDtoMapper: () => {
        dto: Dto['PaymentLinkDtoMapper'];
        _Entity: Entities['PaymentLinkDtoMapper'];
        serializeEntityToDto: unknown;
      };
      CreatePaymentLinkDtoMapper: () => {
        dto: Dto['CreatePaymentLinkDtoMapper'];
        _Entity: Entities['CreatePaymentLinkDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
      UpdatePaymentLinkDtoMapper: () => {
        dto: Dto['UpdatePaymentLinkDtoMapper'];
        _Entity: Entities['UpdatePaymentLinkDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
    }
  ) {
    this.#dtoMappers = transformIntoInternalDtoMapper(dtoMappers);
  }

  protected cacheKeyPrefix = 'payment_link';
  protected createCacheKey = createCacheKey(this.cacheKeyPrefix);

  async createPaymentLink(
    paymentLinkDto: Dto['CreatePaymentLinkDtoMapper']
  ): Promise<Dto['PaymentLinkDtoMapper']> {
    // TODO: Perform permission checks here
    const paymentLink =
      this.#dtoMappers.CreatePaymentLinkDtoMapper.deserializeDtoToEntity(
        paymentLinkDto
      );
    await this.cache.putRecord({
      key: this.createCacheKey(paymentLink.id),
      value: paymentLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#dtoMappers.PaymentLinkDtoMapper.serializeEntityToDto(
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
      this.#dtoMappers.UpdatePaymentLinkDtoMapper.deserializeDtoToEntity(
        paymentLinkDto
      );
    const updatedLink = { ...existingLink, ...paymentLink };
    await this.cache.putRecord({
      key: cacheKey,
      value: updatedLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#dtoMappers.PaymentLinkDtoMapper.serializeEntityToDto(
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

    return this.#dtoMappers.PaymentLinkDtoMapper.serializeEntityToDto(
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
          this.#dtoMappers.PaymentLinkDtoMapper.serializeEntityToDto(
            paymentLink.value
          );
        return paymentLinkDto;
      })
    );
  }
}
