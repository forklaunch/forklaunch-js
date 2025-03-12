import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { SchemaValidator } from '@forklaunch/framework-core';
import { Metrics } from '@forklaunch/framework-monitoring';
import { v4 } from 'uuid';
import { PaymentLinkService } from '../interfaces/paymentLink.service.interface';
import {
  CreatePaymentLinkDto,
  CreatePaymentLinkDtoMapper,
  PaymentLinkDto,
  PaymentLinkDtoMapper,
  UpdatePaymentLinkDto,
  UpdatePaymentLinkDtoMapper
} from '../models/dtoMapper/paymentLink.dtoMapper';
import { PaymentLink } from '../models/persistence/paymentLink.entity';

export class BasePaymentLinkService implements PaymentLinkService {
  constructor(
    private cache: TtlCache,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  private cacheKeyPrefix = 'payment_link';
  private createCacheKey = createCacheKey(this.cacheKeyPrefix);

  async createPaymentLink(
    paymentLinkDto: CreatePaymentLinkDto
  ): Promise<PaymentLinkDto> {
    // TODO: Perform permission checks here
    const linkId = v4();
    const paymentLink = CreatePaymentLinkDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      paymentLinkDto
    );
    await this.cache.putRecord({
      key: this.createCacheKey(linkId),
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

  async getPaymentLink(id: string): Promise<PaymentLinkDto> {
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

  async expirePaymentLink(id: string): Promise<void> {
    // TODO: log payment link expiration, the payment system should keep a record, but we should too
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentSuccess(id: string): Promise<void> {
    // TODO: log payment link success, the payment system should keep a record, but we should too
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async handlePaymentFailure(id: string): Promise<void> {
    // TODO: log payment link failure, the payment system should keep a record, but we should too
    await this.cache.deleteRecord(this.createCacheKey(id));
  }

  async listPaymentLinks(ids?: string[]): Promise<PaymentLinkDto[]> {
    // TODO: Perform admin permission checks here
    const keys =
      ids?.map((id) => this.createCacheKey(id)) ??
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
