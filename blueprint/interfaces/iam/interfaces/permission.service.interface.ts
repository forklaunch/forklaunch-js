import { EntityManager } from '@mikro-orm/core';
import { PermissionServiceParameters } from '../types/permission.service.types';

export interface PermissionService<
  Params extends PermissionServiceParameters = PermissionServiceParameters
> {
  createPermission(
    permissionDto: Params['CreatePermissionDto'],
    em?: EntityManager
  ): Promise<Params['PermissionDto']>;
  createBatchPermissions(
    permissionDtos: Params['CreatePermissionDto'][],
    em?: EntityManager
  ): Promise<Params['PermissionDto'][]>;
  getPermission(
    idDto: Params['IdDto'],
    em?: EntityManager
  ): Promise<Params['PermissionDto']>;
  getBatchPermissions(
    idsDto: Params['IdsDto'],
    em?: EntityManager
  ): Promise<Params['PermissionDto'][]>;
  updatePermission(
    permissionDto: Params['UpdatePermissionDto'],
    em?: EntityManager
  ): Promise<Params['PermissionDto']>;
  updateBatchPermissions(
    permissionDtos: Params['UpdatePermissionDto'][],
    em?: EntityManager
  ): Promise<Params['PermissionDto'][]>;
  deletePermission(idDto: Params['IdDto'], em?: EntityManager): Promise<void>;
  deleteBatchPermissions(
    idsDto: Params['IdsDto'],
    em?: EntityManager
  ): Promise<void>;
}
