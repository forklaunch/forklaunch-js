import { EntityManager } from '@mikro-orm/core';
import { BaseSubscriptionDtos } from './baseBillingDto.types';
import { BaseSubscriptionEntities } from './baseBillingEntity.types';

export type SubscriptionMappers<
  PartyType,
  BillingProviderType,
  MapperEntities extends BaseSubscriptionEntities<
    PartyType,
    BillingProviderType
  >,
  MapperDomains extends BaseSubscriptionDtos<PartyType, BillingProviderType>
> = {
  SubscriptionMapper: {
    toDto: (
      entity: MapperEntities['SubscriptionMapper']
    ) => Promise<MapperDomains['SubscriptionMapper']>;
  };
  CreateSubscriptionMapper: {
    toEntity: (
      dto: MapperDomains['CreateSubscriptionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['CreateSubscriptionMapper']>;
  };
  UpdateSubscriptionMapper: {
    toEntity: (
      dto: MapperDomains['UpdateSubscriptionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['UpdateSubscriptionMapper']>;
  };
};
