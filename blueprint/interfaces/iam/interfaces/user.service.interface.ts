import { EntityManager } from '@mikro-orm/core';
import { UserServiceParameters } from '../types/user.service.types';

export interface UserService<
  Params extends UserServiceParameters = UserServiceParameters
> {
  createUser(
    userDto: Params['CreateUserDto'],
    em?: EntityManager
  ): Promise<Params['UserDto']>;
  createBatchUsers(
    userDtos: Params['CreateUserDto'][],
    em?: EntityManager
  ): Promise<Params['UserDto'][]>;
  getUser(
    idDto: Params['IdDto'],
    em?: EntityManager
  ): Promise<Params['UserDto']>;
  getBatchUsers(
    idsDto: Params['IdsDto'],
    em?: EntityManager
  ): Promise<Params['UserDto'][]>;
  updateUser(
    userDto: Params['UpdateUserDto'],
    em?: EntityManager
  ): Promise<Params['UserDto']>;
  updateBatchUsers(
    userDtos: Params['UpdateUserDto'][],
    em?: EntityManager
  ): Promise<Params['UserDto'][]>;
  deleteUser(idDto: Params['IdDto'], em?: EntityManager): Promise<void>;
  deleteBatchUsers(idsDto: Params['IdsDto'], em?: EntityManager): Promise<void>;
  surfaceRoles(
    idDto: Params['IdDto'],
    em?: EntityManager
  ): Promise<Params['UserDto']['roles']>;
  surfacePermissions(
    idDto: Params['IdDto'],
    em?: EntityManager
  ): Promise<Params['UserDto']['roles'][0]['permissions']>;
}
