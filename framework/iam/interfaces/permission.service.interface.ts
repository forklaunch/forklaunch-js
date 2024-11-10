// https://ts.dev/style/#descriptive-names

import { BaseService } from '@forklaunch/core/services';
import { EntityManager } from '@mikro-orm/core';
import {
  CreatePermissionDto,
  PermissionDto,
  UpdatePermissionDto
} from '../models/dtoMapper/permission.dtoMapper';

export interface PermissionService extends BaseService {
  createPermission(
    permissionDto: CreatePermissionDto,
    em?: EntityManager
  ): Promise<PermissionDto>;
  createBatchPermissions(
    permissionDtos: CreatePermissionDto[],
    em?: EntityManager
  ): Promise<PermissionDto[]>;
  getPermission(id: string, em?: EntityManager): Promise<PermissionDto>;
  getBatchPermissions(
    ids: string[],
    em?: EntityManager
  ): Promise<PermissionDto[]>;
  updatePermission(
    permissionDto: UpdatePermissionDto,
    em?: EntityManager
  ): Promise<PermissionDto>;
  updateBatchPermissions(
    permissionDtos: UpdatePermissionDto[],
    em?: EntityManager
  ): Promise<PermissionDto[]>;
  deletePermission(id: string, em?: EntityManager): Promise<void>;
  deletePermissions(ids: string[], em?: EntityManager): Promise<void>;
}
