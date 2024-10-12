// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import { Permission } from '../models/persistence//permission.entity';
import { Role } from '../models/persistence/role.entity';

export type CreatePermissionData = {
  permission: Permission;
  addToRoles?: Role[];
};
export type UpdatePermissionData = CreatePermissionData & {
  removeFromRoles?: Role[];
};

export interface PermissionService extends BaseService {
  createPermission(data: CreatePermissionData): Promise<void>;
  createBatchPermissions(data: CreatePermissionData[]): Promise<void>;
  getPermission(id: string): Promise<Permission>;
  getBatchPermissions(ids: string[]): Promise<Permission[]>;
  updatePermission(data: UpdatePermissionData): Promise<void>;
  updateBatchPermissions(data: UpdatePermissionData[]): Promise<void>;
  deletePermission(id: string): Promise<void>;
  deletePermissions(ids: string[]): Promise<void>;
}
