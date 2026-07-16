import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BasePromoCodeDtos } from './baseEcommerceDto.types';
import { BasePromoCodeEntities } from './baseEcommerceEntity.types';

export type PromoCodeMappers<
  MapperEntities extends BasePromoCodeEntities,
  MapperDomains extends BasePromoCodeDtos = BasePromoCodeDtos
> = {
  PromoCodeMapper: {
    entity: MapperEntities['PromoCodeMapper'];
    toDto: (
      entity: InferEntity<MapperEntities['PromoCodeMapper']>
    ) => Promise<MapperDomains['PromoCodeMapper']>;
  };
  CreatePromoCodeMapper: {
    entity: MapperEntities['CreatePromoCodeMapper'];
    toEntity: (
      dto: MapperDomains['CreatePromoCodeMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<InferEntity<MapperEntities['CreatePromoCodeMapper']>>;
  };
  UpdatePromoCodeMapper: {
    entity: MapperEntities['UpdatePromoCodeMapper'];
    toEntity: (
      dto: MapperDomains['UpdatePromoCodeMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<InferEntity<MapperEntities['UpdatePromoCodeMapper']>>;
  };
};
