import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BaseGiftCardDtos } from './baseEcommerceDto.types';
import { BaseGiftCardEntities } from './baseEcommerceEntity.types';

export type GiftCardMappers<
  MapperEntities extends BaseGiftCardEntities,
  MapperDomains extends BaseGiftCardDtos = BaseGiftCardDtos
> = {
  GiftCardMapper: {
    entity: MapperEntities['GiftCardMapper'];
    toDto: (
      entity: InferEntity<MapperEntities['GiftCardMapper']>
    ) => Promise<MapperDomains['GiftCardMapper']>;
  };
  CreateGiftCardMapper: {
    entity: MapperEntities['CreateGiftCardMapper'];
    toEntity: (
      dto: MapperDomains['CreateGiftCardMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<InferEntity<MapperEntities['CreateGiftCardMapper']>>;
  };
};
