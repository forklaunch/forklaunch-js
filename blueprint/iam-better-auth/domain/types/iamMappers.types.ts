import { SchemaValidator } from '@forklaunch/blueprint-core';
import { Schema } from '@forklaunch/validator';
import {
  Organization,
  Permission,
  Role,
  User
} from '../../persistence/entities';
import {
  CreateUserMapper,
  UpdateUserMapper,
  UserMapper
} from '../mappers/user.mappers';

// organization mappers
export type OrganizationMapperEntityTypes = {
  OrganizationMapper: Organization;
  CreateOrganizationMapper: Organization;
  UpdateOrganizationMapper: Organization;
};

// permission entity mappers
export type PermissionMapperEntityTypes = {
  PermissionMapper: Permission;
  CreatePermissionMapper: Permission;
  UpdatePermissionMapper: Permission;
  RoleEntityMapper: Role;
};

// role entity mappers
export type RoleMapperEntityTypes = {
  RoleMapper: Role;
  CreateRoleMapper: Role;
  UpdateRoleMapper: Role;
};

// user entity mappers
export type UserMapperEntityTypes = {
  UserMapper: User;
  CreateUserMapper: User;
  UpdateUserMapper: User;
};

// user domain object mappers
export type UserMapperDomainObjectTypes = {
  UserMapper: Schema<typeof UserMapper.schema, SchemaValidator>;
  CreateUserMapper: Schema<typeof CreateUserMapper.schema, SchemaValidator>;
  UpdateUserMapper: Schema<typeof UpdateUserMapper.schema, SchemaValidator>;
};
