// https://ts.dev/style/#descriptive-usernames

import { BaseService } from '@forklaunch/core/services';
import { EntityManager } from '@mikro-orm/core';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto
} from '../models/dtoMapper/user.dtoMapper';

export type CreateUserData = {
  userDto: CreateUserDto;
  roleIds?: string[];
  organizationId?: string;
};
export type UpdateUserData = { userDto: UpdateUserDto; roleIds?: string[] };

export interface UserService extends BaseService {
  createUser(userData: CreateUserData, em?: EntityManager): Promise<UserDto>;
  createBatchUsers(
    userData: CreateUserData[],
    em?: EntityManager
  ): Promise<UserDto[]>;
  getUser(id: string, em?: EntityManager): Promise<UserDto>;
  getBatchUsers(ids: string[], em?: EntityManager): Promise<UserDto[]>;
  updateUser(userData: UpdateUserData, em?: EntityManager): Promise<UserDto>;
  updateBatchUsers(
    userData: UpdateUserData[],
    em?: EntityManager
  ): Promise<UserDto[]>;
  deleteUser(id: string, em?: EntityManager): Promise<void>;
  deleteUsers(ids: string[], em?: EntityManager): Promise<void>;

  verifyHasRole(id: string, roleId: string, em?: EntityManager): Promise<void>;
  verifyHasPermission(
    id: string,
    permissionId: string,
    em?: EntityManager
  ): Promise<void>;
}
