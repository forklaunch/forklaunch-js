import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BaseSubscriptionDtos } from './baseEcommerceDto.types';
import { BaseSubscriptionEntities } from './baseEcommerceEntity.types';

export type SubscriptionMappers<
  MapperEntities extends BaseSubscriptionEntities,
  MapperDomains extends BaseSubscriptionDtos = BaseSubscriptionDtos
> = {
  SubscriptionMapper: {
    entity: MapperEntities['SubscriptionMapper'];
    toDto: (
      entity: InferEntity<MapperEntities['SubscriptionMapper']>
    ) => Promise<MapperDomains['SubscriptionMapper']>;
  };
  CreateSubscriptionMapper: {
    entity: MapperEntities['CreateSubscriptionMapper'];
    toEntity: (
      dto: MapperDomains['CreateSubscriptionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<InferEntity<MapperEntities['CreateSubscriptionMapper']>>;
  };
  UpdateSubscriptionMapper: {
    entity: MapperEntities['UpdateSubscriptionMapper'];
    toEntity: (
      dto: MapperDomains['UpdateSubscriptionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<InferEntity<MapperEntities['UpdateSubscriptionMapper']>>;
  };
};
