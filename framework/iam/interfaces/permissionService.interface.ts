// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import {
  CreatePermissionDto,
  PermissionDto
} from '../models/dtoMapper/permission.dtoMapper';
import { RoleDto } from '../models/dtoMapper/role.dtoMapper';

export type CreatePermissionData = {
  permission: CreatePermissionDto;
  addToRoles?: RoleDto[];
};
export type UpdatePermissionData = CreatePermissionData & {
  removeFromRoles?: RoleDto[];
};

export interface PermissionService extends BaseService {
  createPermission(
    permissionData: CreatePermissionData
  ): Promise<PermissionDto>;
  createBatchPermissions(
    permissionData: CreatePermissionData[]
  ): Promise<PermissionDto[]>;
  getPermission(id: string): Promise<PermissionDto>;
  getBatchPermissions(ids: string[]): Promise<PermissionDto[]>;
  updatePermission(
    permissionData: UpdatePermissionData
  ): Promise<PermissionDto>;
  updateBatchPermissions(
    permissionData: UpdatePermissionData[]
  ): Promise<PermissionDto[]>;
  deletePermission(id: string): Promise<void>;
  deletePermissions(ids: string[]): Promise<void>;
}
