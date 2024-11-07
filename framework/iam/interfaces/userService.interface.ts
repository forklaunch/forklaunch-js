// https://ts.dev/style/#descriptive-usernames

import { BaseService } from '@forklaunch/core/services';
import { OrganizationDto } from '../models/dtoMapper/organization.dtoMapper';
import { RoleDto } from '../models/dtoMapper/role.dtoMapper';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto
} from '../models/dtoMapper/user.dtoMapper';

export type CreateUserData = {
  user: CreateUserDto;
  roles?: RoleDto[];
  organization?: OrganizationDto;
};
export type UpdateUserData = { user: UpdateUserDto; roles?: RoleDto[] };

export interface UserService extends BaseService {
  createUser(userData: CreateUserData): Promise<UserDto>;
  createBatchUsers(userData: CreateUserData[]): Promise<UserDto>;
  getUser(id: string): Promise<UserDto>;
  getBatchUsers(ids: string[]): Promise<UserDto[]>;
  updateUser(userData: UpdateUserData): Promise<UserDto>;
  updateBatchUsers(userData: UpdateUserData[]): Promise<UserDto>;
  deleteUser(id: string): Promise<void>;
  deleteUsers(ids: string[]): Promise<void>;

  verifyHasRole(id: string, roleId: string): Promise<void>;
  verifyHasPermission(id: string, permissionId: string): Promise<void>;
}
