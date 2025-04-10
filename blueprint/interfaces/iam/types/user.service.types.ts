import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { RoleDto } from './role.service.types';

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
