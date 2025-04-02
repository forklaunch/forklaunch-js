import { IdDto, IdsDto, RecordTimingDto } from '@forklaunch/common';
import { EntityManager } from '@mikro-orm/core';
import { PermissionDto } from './permission.service.interface';

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

export interface RoleService<
  Params extends RoleServiceParameters = RoleServiceParameters
> {
  createRole(
    roleDto: Params['CreateRoleDto'],
    em?: EntityManager
  ): Promise<Params['RoleDto']>;
  createBatchRoles(
    roleDtos: Params['CreateRoleDto'][],
    em?: EntityManager
  ): Promise<Params['RoleDto'][]>;
  getRole(
    idDto: Params['IdDto'],
    em?: EntityManager
  ): Promise<Params['RoleDto']>;
  getBatchRoles(
    idsDto: Params['IdsDto'],
    em?: EntityManager
  ): Promise<Params['RoleDto'][]>;
  updateRole(
    roleDto: Params['UpdateRoleDto'],
    em?: EntityManager
  ): Promise<Params['RoleDto']>;
  updateBatchRoles(
    roleDtos: Params['UpdateRoleDto'][],
    em?: EntityManager
  ): Promise<Params['RoleDto'][]>;
  deleteRole(idDto: Params['IdDto'], em?: EntityManager): Promise<void>;
  deleteBatchRoles(idsDto: Params['IdsDto'], em?: EntityManager): Promise<void>;
}
