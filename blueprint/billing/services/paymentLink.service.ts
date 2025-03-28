import {
  BaseDtoParameters,
  IdDto,
  IdsDtoSchema,
  SchemaValidator
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  BasePaymentLinkServiceParameters,
  PaymentLinkService
} from '../interfaces/paymentLink.service.interface';
import {
  CreatePaymentLinkDto,
  CreatePaymentLinkDtoMapper,
  PaymentLinkDto,
  PaymentLinkDtoMapper,
  UpdatePaymentLinkDto,
  UpdatePaymentLinkDtoMapper
} from '../models/dtoMapper/paymentLink.dtoMapper';
import { PaymentLink } from '../models/persistence/paymentLink.entity';

export class BasePaymentLinkService
  implements
    PaymentLinkService<
      BaseDtoParameters<typeof BasePaymentLinkServiceParameters>
    >
{
  SchemaDefinition = BasePaymentLinkServiceParameters;

  constructor(
    protected readonly cache: TtlCache,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  protected cacheKeyPrefix = 'payment_link';
  protected createCacheKey = createCacheKey(this.cacheKeyPrefix);

  async createPaymentLink(
    paymentLinkDto: CreatePaymentLinkDto
  ): Promise<PaymentLinkDto> {
    // TODO: Perform permission checks here
    const paymentLink = CreatePaymentLinkDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      paymentLinkDto
    );
    await this.cache.putRecord({
      key: this.createCacheKey(paymentLink.id),
      value: paymentLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });
    const createdPaymentLinkDto = PaymentLinkDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      paymentLink
    );

    return createdPaymentLinkDto;
  }

  async updatePaymentLink(
    paymentLinkDto: UpdatePaymentLinkDto
  ): Promise<PaymentLinkDto> {
    const cacheKey = this.createCacheKey(paymentLinkDto.id);
    const existingLink = await this.cache.readRecord<PaymentLink>(cacheKey);
    if (!existingLink) {
      throw new Error('Payment link not found');
    }
    const paymentLink = UpdatePaymentLinkDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      paymentLinkDto
    );
    const updatedLink = { ...existingLink, ...paymentLink };
    await this.cache.putRecord({
      key: cacheKey,
      value: updatedLink,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });
    const updatedPaymentLinkDto = PaymentLinkDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      PaymentLink.update(updatedLink)
    );

    return updatedPaymentLinkDto;
  }

  async getPaymentLink({ id }: IdDto): Promise<PaymentLinkDto> {
    const cacheKey = this.createCacheKey(id);
    const paymentLink = await this.cache.readRecord<PaymentLink>(cacheKey);
    if (!paymentLink) {
      throw new Error('Payment link not found');
    }
    const retrievedPaymentLink = PaymentLinkDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      paymentLink.value
    );

    return retrievedPaymentLink;
  }

  async expirePaymentLink({ id }: IdDto): Promise<void> {
    // TODO: log payment link expiration, the payment system should keep a record, but we should too
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentSuccess({ id }: IdDto): Promise<void> {
    // TODO: log payment link success, the payment system should keep a record, but we should too
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentFailure({ id }: IdDto): Promise<void> {
    // TODO: log payment link failure, the payment system should keep a record, but we should too
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async listPaymentLinks(idsDto?: IdsDtoSchema): Promise<PaymentLinkDto[]> {
    // TODO: Perform admin permission checks here
    const keys =
      idsDto?.ids.map((id) => this.createCacheKey(id)) ??
      (await this.cache.listKeys(this.cacheKeyPrefix));

    return await Promise.all(
      keys.map(async (key) => {
        const paymentLink = await this.cache.readRecord<PaymentLink>(key);
        const paymentLinkDto = PaymentLinkDtoMapper.serializeEntityToDto(
          SchemaValidator(),
          paymentLink.value
        );
        return paymentLinkDto;
      })
    );
  }
}
