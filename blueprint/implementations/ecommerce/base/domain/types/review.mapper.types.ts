import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BaseReviewDtos } from './baseEcommerceDto.types';
import { BaseReviewEntities } from './baseEcommerceEntity.types';

export type ReviewMappers<
  MapperEntities extends BaseReviewEntities,
  MapperDomains extends BaseReviewDtos = BaseReviewDtos
> = {
  ReviewMapper: {
    entity: MapperEntities['ReviewMapper'];
    toDto: (
      entity: InferEntity<MapperEntities['ReviewMapper']>
    ) => Promise<MapperDomains['ReviewMapper']>;
  };
  CreateReviewMapper: {
    entity: MapperEntities['CreateReviewMapper'];
    toEntity: (
      dto: MapperDomains['CreateReviewMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<InferEntity<MapperEntities['CreateReviewMapper']>>;
  };
  UpdateReviewMapper: {
    entity: MapperEntities['UpdateReviewMapper'];
    toEntity: (
      dto: MapperDomains['UpdateReviewMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<InferEntity<MapperEntities['UpdateReviewMapper']>>;
  };
};
