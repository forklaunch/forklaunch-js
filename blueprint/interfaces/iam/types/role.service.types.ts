import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { PermissionDto } from './permission.service.types';

export type CreateRoleDto = {
  name: string;
  permissionsIds?: PermissionDto[];
  extraFields?: unknown;
};
export type UpdateRoleDto = IdDto & Partial<CreateRoleDto>;
export type RoleDto = IdDto &
  Omit<CreateRoleDto, 'permissionsIds'> &
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
