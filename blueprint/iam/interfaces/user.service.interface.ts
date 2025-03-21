// https://ts.dev/style/#descriptive-usernames

import { EntityManager } from '@mikro-orm/core';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto
} from '../models/dtoMapper/user.dtoMapper';

export interface UserService {
  createUser(userDto: CreateUserDto, em?: EntityManager): Promise<UserDto>;
  createBatchUsers(
    userDtos: CreateUserDto[],
    em?: EntityManager
  ): Promise<UserDto[]>;
  getUser(id: string, em?: EntityManager): Promise<UserDto>;
  getBatchUsers(ids: string[], em?: EntityManager): Promise<UserDto[]>;
  updateUser(userDto: UpdateUserDto, em?: EntityManager): Promise<UserDto>;
  updateBatchUsers(
    userDtos: UpdateUserDto[],
    em?: EntityManager
  ): Promise<UserDto[]>;
  deleteUser(id: string, em?: EntityManager): Promise<void>;
  deleteBatchUsers(ids: string[], em?: EntityManager): Promise<void>;

  verifyHasRole(id: string, roleId: string, em?: EntityManager): Promise<void>;
  verifyHasPermission(
    id: string,
    permissionId: string,
    em?: EntityManager
  ): Promise<void>;
}
