import { EntityManager } from '@mikro-orm/core';
import { UserDtos } from './iamDto.types';
import { UserEntities } from './iamEntities.types';

export type UserMappers<
  MapperEntities extends UserEntities,
  MapperDomains extends UserDtos
> = {
  UserMapper: {
    toDto: (
      entity: MapperEntities['UserMapper']
    ) => Promise<MapperDomains['UserMapper']>;
  };
  CreateUserMapper: {
    toEntity: (
      dto: MapperDomains['CreateUserMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['CreateUserMapper']>;
  };
  UpdateUserMapper: {
    toEntity: (
      dto: MapperDomains['UpdateUserMapper'],
      em: EntityManager,
      ...args: unknown[]
    ) => Promise<MapperEntities['UpdateUserMapper']>;
  };
};
