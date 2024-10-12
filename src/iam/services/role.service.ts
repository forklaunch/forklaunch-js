import { EntityManager } from '@mikro-orm/core';
import {
  CreateRoleData,
  RoleService,
  UpdateRoleData
} from '../interfaces/roleService.interface';
import { Role } from '../models/persistence/role.entity';

export default class BaseRoleService implements RoleService {
  constructor(public em: EntityManager) {}

  async createRole(data: CreateRoleData): Promise<void> {
    await this.em.persistAndFlush(data);
  }

  async createBatchRoles(data: CreateRoleData[]): Promise<void> {
    await this.em.persistAndFlush(data);
  }

  async getRole(id: string): Promise<Role> {
    return await this.em.findOneOrFail(Role, { id });
  }

  async getBatchRoles(ids: string[]): Promise<Role[]> {
    return await this.em.find(Role, ids);
  }

  async updateRole(data: UpdateRoleData): Promise<void> {
    const updatedRole = await this.em.upsert(Role, data);
    await this.em.persistAndFlush(updatedRole);
  }

  async updateBatchRoles(data: UpdateRoleData[]): Promise<void> {
    const updatedRoles = await this.em.upsertMany(Role, data);
    await this.em.persistAndFlush(updatedRoles);
  }

  async deleteRole(id: string): Promise<void> {
    await this.em.nativeDelete(Role, { id });
  }

  async deleteRoles(ids: string[]): Promise<void> {
    await this.em.nativeDelete(Role, { id: { $in: ids } });
  }
}
