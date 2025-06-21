import {
  CreateOrganizationDto,
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  OrganizationDto,
  PermissionDto,
  RoleDto,
  UpdateOrganizationDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
  UserDto
} from '@forklaunch/interfaces-iam/types';

// organization
export type OrganizationDtos<OrganizationStatus> = {
  OrganizationMapper: OrganizationDto<OrganizationStatus>;
  CreateOrganizationMapper: CreateOrganizationDto;
  UpdateOrganizationMapper: UpdateOrganizationDto;
};

// permission
export type PermissionDtos = {
  PermissionMapper: PermissionDto;
  CreatePermissionMapper: CreatePermissionDto;
  UpdatePermissionMapper: UpdatePermissionDto;
  RoleEntityMapper: UpdateRoleDto;
};

// role
export type RoleDtos = {
  RoleMapper: RoleDto;
  CreateRoleMapper: CreateRoleDto;
  UpdateRoleMapper: UpdateRoleDto;
};

// user
export type UserDtos = {
  UserMapper: UserDto;
  CreateUserMapper: CreateUserDto;
  UpdateUserMapper: UpdateUserDto;
};
