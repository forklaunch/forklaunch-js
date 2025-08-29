import { EntityManager } from '@mikro-orm/core';
import { BaseCheckoutSessionDtos } from './baseBillingDto.types';
import { BaseCheckoutSessionEntities } from './baseBillingEntity.types';

export type CheckoutSessionMappers<
  PaymentMethodEnum,
  CurrencyEnum,
  StatusEnum,
  MapperEntities extends BaseCheckoutSessionEntities<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >,
  MapperDomains extends BaseCheckoutSessionDtos<
    PaymentMethodEnum,
    CurrencyEnum,
    StatusEnum
  >
> = {
  CheckoutSessionMapper: {
    toDomain: (
      entity: MapperEntities['CheckoutSessionMapper']
    ) => Promise<MapperDomains['CheckoutSessionMapper']>;
  };
  CreateCheckoutSessionMapper: {
    toEntity: (
      dto: MapperDomains['CreateCheckoutSessionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['CreateCheckoutSessionMapper']>;
  };
  UpdateCheckoutSessionMapper: {
    toEntity: (
      dto: MapperDomains['UpdateCheckoutSessionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['UpdateCheckoutSessionMapper']>;
  };
};
