import {
  Organization,
  Permission,
  Role,
  User
} from '../../persistence/entities';

// organization mappers
export type OrganizationMapperTypes = {
  OrganizationMapper: Organization;
  CreateOrganizationMapper: Organization;
  UpdateOrganizationMapper: Organization;
};

// permission mappers
export type PermissionMapperTypes = {
  PermissionMapper: Permission;
  CreatePermissionMapper: Permission;
  UpdatePermissionMapper: Permission;
  RoleEntityMapper: Role;
};

// role mappers
export type RoleMapperTypes = {
  RoleMapper: Role;
  CreateRoleMapper: Role;
  UpdateRoleMapper: Role;
};

// user mappers
export type UserMapperTypes = {
  UserMapper: User;
  CreateUserMapper: User;
  UpdateUserMapper: User;
};
