import { EntityManager } from '@mikro-orm/core';
import { BaseBillingDtos } from '../../dist/domain/types/baseBillingDto.types';
import { BaseBillingEntities } from '../../dist/domain/types/baseBillingEntity.types';

export type BillingPortalMappers<
  MapperEntities extends BaseBillingEntities,
  MapperDomains extends BaseBillingDtos
> = {
  BillingPortalMapper: {
    toDto: (
      entity: MapperEntities['BillingPortalMapper']
    ) => Promise<MapperDomains['BillingPortalMapper']>;
  };
  CreateBillingPortalMapper: {
    toEntity: (
      dto: MapperDomains['CreateBillingPortalMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['CreateBillingPortalMapper']>;
  };
  UpdateBillingPortalMapper: {
    toEntity: (
      dto: MapperDomains['UpdateBillingPortalMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['UpdateBillingPortalMapper']>;
  };
};
