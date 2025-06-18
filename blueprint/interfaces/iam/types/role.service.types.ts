import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { PermissionDto } from './permission.service.types';

export type CreateRoleDto = Partial<IdDto> & {
  name: string;
  permissionIds?: string[];
  providerFields?: unknown;
};
export type UpdateRoleDto = Partial<CreateRoleDto> & IdDto;
export type RoleDto = Omit<CreateRoleDto, 'permissionIds'> &
  IdDto &
  Partial<RecordTimingDto> & {
    permissions: PermissionDto[];
  };

export type RoleServiceParameters = {
  CreateRoleDto: CreateRoleDto;
  RoleDto: RoleDto;
  UpdateRoleDto: UpdateRoleDto;
  IdDto: IdDto;
  IdsDto: IdsDto;
};
