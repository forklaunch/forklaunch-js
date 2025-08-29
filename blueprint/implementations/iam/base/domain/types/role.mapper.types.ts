import { EntityManager } from '@mikro-orm/core';
import { RoleDtos } from './iamDto.types';
import { RoleEntities } from './iamEntities.types';

export type RoleMappers<
  MapperEntities extends RoleEntities,
  MapperDomains extends RoleDtos
> = {
  RoleMapper: {
    toDto: (
      entity: MapperEntities['RoleMapper']
    ) => Promise<MapperDomains['RoleMapper']>;
  };
  CreateRoleMapper: {
    toEntity: (
      dto: MapperDomains['CreateRoleMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['CreateRoleMapper']>;
  };
  UpdateRoleMapper: {
    toEntity: (
      dto: MapperDomains['UpdateRoleMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['UpdateRoleMapper']>;
  };
};
