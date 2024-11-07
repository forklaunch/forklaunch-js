// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import {
  CreateRoleDto,
  RoleDto,
  UpdateRoleDto
} from '../models/dtoMapper/role.dtoMapper';
import { Role } from '../models/persistence/role.entity';

export type CreateRoleData = Role;
export type UpdateRoleData = CreateRoleData;

export interface RoleService extends BaseService {
  createRole(roleDto: CreateRoleDto): Promise<RoleDto>;
  createBatchRoles(roleDtos: CreateRoleDto[]): Promise<RoleDto[]>;
  getRole(id: string): Promise<RoleDto>;
  getBatchRoles(ids: string[]): Promise<RoleDto[]>;
  updateRole(roleDto: UpdateRoleDto): Promise<RoleDto>;
  updateBatchRoles(roleDtos: UpdateRoleDto[]): Promise<RoleDto[]>;
  deleteRole(id: string): Promise<void>;
  deleteRoles(ids: string[]): Promise<void>;
}
