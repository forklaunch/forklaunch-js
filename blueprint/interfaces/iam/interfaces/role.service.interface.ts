import { EntityManager } from '@mikro-orm/core';
import { RoleServiceParameters } from '../types/role.service.types';

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
