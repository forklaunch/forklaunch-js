import { EntityManager } from '@mikro-orm/core';
import { PermissionDtos } from './iamDto.types';
import { PermissionEntities } from './iamEntities.types';

export type PermissionMappers<
  MapperEntities extends PermissionEntities,
  MapperDomains extends PermissionDtos
> = {
  PermissionMapper: {
    toDto: (
      entity: MapperEntities['PermissionMapper']
    ) => Promise<MapperDomains['PermissionMapper']>;
  };
  CreatePermissionMapper: {
    toEntity: (
      dto: MapperDomains['CreatePermissionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['CreatePermissionMapper']>;
  };
  UpdatePermissionMapper: {
    toEntity: (
      dto: MapperDomains['UpdatePermissionMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['UpdatePermissionMapper']>;
  };
  RoleEntityMapper: {
    toEntity: (
      dto: MapperDomains['RoleEntityMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['RoleEntityMapper']>;
  };
};
