// https://ts.dev/style/#descriptive-names

import { EntityManager } from '@mikro-orm/core';
import {
  CreateRoleDto,
  RoleDto,
  UpdateRoleDto
} from '../models/dtoMapper/role.dtoMapper';

export interface RoleService {
  createRole(roleDto: CreateRoleDto, em?: EntityManager): Promise<RoleDto>;
  createBatchRoles(
    roleDtos: CreateRoleDto[],
    em?: EntityManager
  ): Promise<RoleDto[]>;
  getRole(id: string, em?: EntityManager): Promise<RoleDto>;
  getBatchRoles(ids: string[], em?: EntityManager): Promise<RoleDto[]>;
  updateRole(roleDto: UpdateRoleDto, em?: EntityManager): Promise<RoleDto>;
  updateBatchRoles(
    roleDtos: UpdateRoleDto[],
    em?: EntityManager
  ): Promise<RoleDto[]>;
  deleteRole(id: string, em?: EntityManager): Promise<void>;
  deleteBatchRoles(ids: string[], em?: EntityManager): Promise<void>;
}
