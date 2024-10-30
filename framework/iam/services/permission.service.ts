import { EntityManager } from '@mikro-orm/core';
import {
  CreatePermissionData,
  PermissionService,
  UpdatePermissionData
} from '../interfaces/permissionService.interface';
import { Permission } from '../models/persistence/permission.entity';
import { Role } from '../models/persistence/role.entity';

export default class BasePermissionService implements PermissionService {
  constructor(public em: EntityManager) {}

  private async updateRolesWithPermissions(
    roles: Role[],
    permissions: Permission[]
  ): Promise<Role[]> {
    return await Promise.all(
      roles.map(async (role) => {
        permissions.forEach((permission) => role.permissions.add(permission));
        return role;
      })
    );
  }

  private async removePermissionsFromRoles(
    roles: Role[],
    permissions: Permission[]
  ): Promise<Role[]> {
    return await Promise.all(
      roles.map(async (role) => {
        permissions.forEach((permission) =>
          role.permissions.remove(permission)
        );
        return role;
      })
    );
  }

  private async createPermissionData(data: CreatePermissionData): Promise<{
    permission: Permission;
    roles: Role[];
  }> {
    const { permission, addToRoles } = data;

    let roles: Role[] = [];
    if (addToRoles) {
      roles = await this.updateRolesWithPermissions(addToRoles, [permission]);
    }

    return {
      permission,
      roles
    };
  }

  async createPermission(
    data: CreatePermissionData,
    em?: EntityManager
  ): Promise<void> {
    if (em) {
      const { permission, roles } = await this.createPermissionData(data);
      await em.persist([permission, ...roles]);
    } else {
      await this.em.transactional(async (localEm) => {
        const { permission, roles } = await this.createPermissionData(data);
        await localEm.persist([permission, ...roles]);
      });
    }
  }

  async createBatchPermissions(data: CreatePermissionData[]): Promise<void> {
    const rolesCache: Record<string, Role> = {};
    const permissions: Permission[] = [];
    await this.em.transactional(async (em) => {
      data.map(async (createPermissionData) => {
        const { permission, roles } =
          await this.createPermissionData(createPermissionData);
        roles.forEach((role) => {
          if (
            rolesCache[role.id] &&
            role.permissions !== rolesCache[role.id].permissions
          ) {
            role.permissions.getItems().forEach((permission) => {
              if (!rolesCache[role.id].permissions.contains(permission)) {
                rolesCache[role.id].permissions.add(permission);
              }
            });
          } else {
            rolesCache[role.id] = role;
          }
        });
        permissions.push(permission);
      });
      await em.persist([...permissions, ...Object.values(rolesCache)]);
    });
  }

  async getPermission(id: string): Promise<Permission> {
    return await this.em.findOneOrFail(Permission, id);
  }

  async getBatchPermissions(ids: string[]): Promise<Permission[]> {
    return await this.em.find(Permission, ids);
  }

  private updatePermissionData = async (
    data: UpdatePermissionData
  ): Promise<{
    permission: Permission;
    roles: Role[];
  }> => {
    const { permission, addToRoles, removeFromRoles } = data;
    let roles: Role[] = [];

    if (addToRoles) {
      roles = roles.concat(
        await this.updateRolesWithPermissions(addToRoles, [permission])
      );
    }
    if (removeFromRoles) {
      roles = roles.concat(
        await this.removePermissionsFromRoles(removeFromRoles, [permission])
      );
    }
    return {
      permission,
      roles
    };
  };

  async updatePermission(
    data: UpdatePermissionData,
    em?: EntityManager
  ): Promise<void> {
    if (em) {
      const { permission, roles } = await this.updatePermissionData(data);
      await em.upsertMany([permission, ...roles]);
    } else {
      await this.em.transactional(async (localEm) => {
        const { permission, roles } = await this.updatePermissionData(data);
        await localEm.upsertMany([permission, ...roles]);
      });
    }
  }

  async updateBatchPermissions(data: UpdatePermissionData[]): Promise<void> {
    const rolesCache: Record<string, Role> = {};
    const permissions: Permission[] = [];
    await this.em.transactional(async (em) => {
      data.map(async (updatePermissionData) => {
        const { permission, roles } =
          await this.updatePermissionData(updatePermissionData);
        roles.forEach((role) => {
          if (
            rolesCache[role.id] &&
            role.permissions !== rolesCache[role.id].permissions
          ) {
            role.permissions.getItems().forEach((permission) => {
              if (!rolesCache[role.id].permissions.contains(permission)) {
                rolesCache[role.id].permissions.add(permission);
              }
            });
          } else {
            rolesCache[role.id] = role;
          }
        });
        permissions.push(permission);
      });
      await em.persist([...permissions, ...Object.values(rolesCache)]);
    });
  }

  async deletePermission(id: string): Promise<void> {
    await this.em.nativeDelete(Permission, { id });
  }

  async deletePermissions(ids: string[]): Promise<void> {
    await this.em.nativeDelete(Permission, { id: { $in: ids } });
  }
}
