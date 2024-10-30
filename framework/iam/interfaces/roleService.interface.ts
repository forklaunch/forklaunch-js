// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import { Role } from '../models/persistence/role.entity';

export type CreateRoleData = Role;
export type UpdateRoleData = CreateRoleData;

export interface RoleService extends BaseService {
  createRole(data: CreateRoleData): Promise<void>;
  createBatchRoles(data: CreateRoleData[]): Promise<void>;
  getRole(id: string): Promise<Role>;
  getBatchRoles(ids: string[]): Promise<Role[]>;
  updateRole(data: UpdateRoleData): Promise<void>;
  updateBatchRoles(data: UpdateRoleData[]): Promise<void>;
  deleteRole(id: string): Promise<void>;
  deleteRoles(ids: string[]): Promise<void>;
}
