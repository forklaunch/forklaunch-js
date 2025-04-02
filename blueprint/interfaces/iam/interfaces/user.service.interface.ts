import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { EntityManager } from '@mikro-orm/core';
import { RoleDto } from './role.service.interface';

export type CreateUserDto = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roleIds: string[];
  phoneNumber?: string;
  subscription?: string;
  extraFields?: unknown;
};
export type UpdateUserDto = IdDto &
  Partial<Omit<CreateUserDto, 'organizationId'>>;

export type UserDto = IdDto &
  Omit<CreateUserDto, 'roleIds' | 'password' | 'organizationId'> &
  Partial<RecordTimingDto> & {
    roles: RoleDto[];
  };

export type UserServiceParameters = {
  CreateUserDto: CreateUserDto;
  UserDto: UserDto;
  UpdateUserDto: UpdateUserDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};

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

  verifyHasRole(
    idDto: Params['IdDto'],
    roleId: string,
    em?: EntityManager
  ): Promise<void>;
  verifyHasPermission(
    idDto: Params['IdDto'],
    permissionIdDto: Params['IdDto'],
    em?: EntityManager
  ): Promise<void>;
}
