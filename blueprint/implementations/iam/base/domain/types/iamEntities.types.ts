import { MapNestedDtoArraysToCollections } from '@forklaunch/core/services';
import {
  OrganizationDto,
  PermissionDto,
  RoleDto,
  UpdateRoleDto,
  UserDto
} from '@forklaunch/interfaces-iam/types';

// organization
export type OrganizationEntities<OrganizationStatus> = {
  OrganizationMapper: MapNestedDtoArraysToCollections<
    OrganizationDto<OrganizationStatus>,
    'users'
  >;
  CreateOrganizationMapper: MapNestedDtoArraysToCollections<
    OrganizationDto<OrganizationStatus>,
    'users'
  >;
  UpdateOrganizationMapper: MapNestedDtoArraysToCollections<
    OrganizationDto<OrganizationStatus>,
    'users'
  >;
};

// permission
export type PermissionEntities = {
  PermissionMapper: PermissionDto;
  CreatePermissionMapper: PermissionDto;
  UpdatePermissionMapper: PermissionDto;
  RoleEntityMapper: MapNestedDtoArraysToCollections<
    UpdateRoleDto,
    'permissions'
  >;
};

// role
export type RoleEntities = {
  RoleMapper: MapNestedDtoArraysToCollections<RoleDto, 'permissions'>;
  CreateRoleMapper: MapNestedDtoArraysToCollections<RoleDto, 'permissions'>;
  UpdateRoleMapper: MapNestedDtoArraysToCollections<RoleDto, 'permissions'>;
};

// user
export type UserEntities = {
  UserMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
  CreateUserMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
  UpdateUserMapper: MapNestedDtoArraysToCollections<UserDto, 'roles'>;
};
