// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import { EntityManager } from '@mikro-orm/core';
import {
  CreatePermissionDto,
  PermissionDto,
  UpdatePermissionDto
} from '../models/dtoMapper/permission.dtoMapper';

export type CreatePermissionData = {
  permissionDto: CreatePermissionDto;
  addToRolesIds?: string[];
};
export type UpdatePermissionData = {
  permissionDto: UpdatePermissionDto;
  addToRolesIds?: string[];
  removeFromRolesIds?: string[];
};

export interface PermissionService extends BaseService {
  createPermission(
    permissionData: CreatePermissionData,
    em?: EntityManager
  ): Promise<PermissionDto>;
  createBatchPermissions(
    permissionData: CreatePermissionData[],
    em?: EntityManager
  ): Promise<PermissionDto[]>;
  getPermission(id: string, em?: EntityManager): Promise<PermissionDto>;
  getBatchPermissions(
    ids: string[],
    em?: EntityManager
  ): Promise<PermissionDto[]>;
  updatePermission(
    permissionData: UpdatePermissionData,
    em?: EntityManager
  ): Promise<PermissionDto>;
  updateBatchPermissions(
    permissionData: UpdatePermissionData[],
    em?: EntityManager
  ): Promise<PermissionDto[]>;
  deletePermission(id: string, em?: EntityManager): Promise<void>;
  deletePermissions(ids: string[], em?: EntityManager): Promise<void>;
}
