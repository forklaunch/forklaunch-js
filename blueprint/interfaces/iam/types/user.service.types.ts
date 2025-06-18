import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { RoleDto } from './role.service.types';

export type CreateUserDto = Partial<IdDto> & {
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
export type UpdateUserDto = Partial<Omit<CreateUserDto, 'organizationId'>> &
  IdDto;

export type UserDto = Omit<
  CreateUserDto,
  'roleIds' | 'password' | 'organizationId'
> &
  IdDto &
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
