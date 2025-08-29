import { EntityManager } from '@mikro-orm/core';
import { BasePaymentLinkDtos } from './baseBillingDto.types';
import { BasePaymentLinkEntities } from './baseBillingEntity.types';

export type PaymentLinkMappers<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum,
  MapperEntities extends BasePaymentLinkEntities<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >,
  MapperDomains extends BasePaymentLinkDtos<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >
> = {
  PaymentLinkMapper: {
    toDto: (
      entity: MapperEntities['PaymentLinkMapper']
    ) => Promise<MapperDomains['PaymentLinkMapper']>;
  };
  CreatePaymentLinkMapper: {
    toEntity: (
      dto: MapperDomains['CreatePaymentLinkMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['CreatePaymentLinkMapper']>;
  };
  UpdatePaymentLinkMapper: {
    toEntity: (
      dto: MapperDomains['UpdatePaymentLinkMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['UpdatePaymentLinkMapper']>;
  };
};
