import { TtlCache } from '@forklaunch/core/cache';
import { SchemaValidator } from '@forklaunch/framework-core';
import { v4 } from 'uuid';
import { PaymentLinkService } from '../interfaces/paymentLinkService.interface';
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
  constructor(private cache: TtlCache) {}

  async createPaymentLink(
    paymentLinkDto: CreatePaymentLinkDto
  ): Promise<PaymentLinkDto> {
    // TODO:Perform permission checks here
    const linkId = v4();
    const paymentLink = CreatePaymentLinkDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      paymentLinkDto
    );
    await this.cache.putRecord({
      key: `payment_link_${linkId}`,
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
    const cacheKey = `payment_link_${paymentLinkDto.id}`;
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
      updatedLink
    );

    return updatedPaymentLinkDto;
  }

  async getPaymentLink(id: string): Promise<PaymentLinkDto> {
    const cacheKey = `payment_link_${id}`;
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

  async listPaymentLinks(ids?: string[]): Promise<PaymentLinkDto[]> {
    // TODO: Perform admin permission checks here
    const keys =
      ids?.map((id) => `payment_link_${id}`) ??
      (await this.cache.listKeys('payment_link'));

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
