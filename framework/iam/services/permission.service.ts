import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import {
  CreatePermissionData,
  PermissionService,
  UpdatePermissionData
} from '../interfaces/permissionService.interface';
import { RoleService } from '../interfaces/roleService.interface';
import {
  CreatePermissionDtoMapper,
  PermissionDto,
  PermissionDtoMapper,
  UpdatePermissionDtoMapper
} from '../models/dtoMapper/permission.dtoMapper';
import { Permission } from '../models/persistence/permission.entity';
import { Role } from '../models/persistence/role.entity';

type CreatePermissionEntityData = {
  permission: Permission;
  addToRoles: Role[];
};

export default class BasePermissionService implements PermissionService {
  private roleService: RoleService;

  constructor(
    public em: EntityManager,
    roleService: () => RoleService
  ) {
    this.roleService = roleService();
  }

  // start: global helper functions
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
  // end: global helper functions

  // start: createPermission helper functions
  private async createPermissionData({
    permission,
    addToRoles
  }: CreatePermissionEntityData): Promise<{
    permission: Permission;
    roles: Role[];
  }> {
    let roles: Role[] = [];
    if (addToRoles) {
      roles = await this.updateRolesWithPermissions(addToRoles, [permission]);
    }

    return { permission, roles };
  }

  private async extractCreatePermissionDataToEntityData(
    { permissionDto, addToRolesIds }: CreatePermissionData,
    em?: EntityManager
  ): Promise<CreatePermissionEntityData> {
    return {
      permission: CreatePermissionDtoMapper.deserializeDtoToEntity(
        SchemaValidator(),
        permissionDto
      ),
      addToRoles: addToRolesIds
        ? await this.roleService.getBatchRoles(addToRolesIds, em)
        : []
    };
  }
  // end: createPermission helper functions

  async createPermission(
    createPermissionData: CreatePermissionData,
    em?: EntityManager
  ): Promise<PermissionDto> {
    const { permission, roles } = await this.createPermissionData(
      await this.extractCreatePermissionDataToEntityData(
        createPermissionData,
        em
      )
    );
    if (em) {
      await em.persist([permission, ...roles]);
    } else {
      this.em.persistAndFlush([permission, ...roles]);
    }
    return PermissionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      permission
    );
  }

  async createBatchPermissions(
    data: CreatePermissionData[],
    em?: EntityManager
  ): Promise<PermissionDto[]> {
    const rolesCache: Record<string, Role> = {};
    const permissions: Permission[] = [];
    await (em ?? this.em).transactional(async (em) => {
      data.map(async (createPermissionData) => {
        const { permission, roles } = await this.createPermissionData(
          await this.extractCreatePermissionDataToEntityData(
            createPermissionData,
            em
          )
        );
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

    if (!em) {
      this.em.flush();
    }

    return permissions.map((permission) =>
      PermissionDtoMapper.serializeEntityToDto(SchemaValidator(), permission)
    );
  }

  async getPermission(id: string, em?: EntityManager): Promise<PermissionDto> {
    return PermissionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Permission, id)
    );
  }

  async getBatchPermissions(
    ids: string[],
    em?: EntityManager
  ): Promise<PermissionDto[]> {
    return (await (em ?? this.em).find(Permission, ids)).map((permission) =>
      PermissionDtoMapper.serializeEntityToDto(SchemaValidator(), permission)
    );
  }

  // start: updatePermission helper functions
  private updatePermissionData = async (
    { permissionDto, addToRolesIds, removeFromRolesIds }: UpdatePermissionData,
    em?: EntityManager
  ): Promise<{
    permission: Permission;
    roles: Role[];
  }> => {
    const permission = UpdatePermissionDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      permissionDto
    );
    const addToRoles = addToRolesIds
      ? await this.roleService.getBatchRoles(addToRolesIds, em)
      : [];
    const removeFromRoles = removeFromRolesIds
      ? await this.roleService.getBatchRoles(removeFromRolesIds, em)
      : [];

    let roles: Role[] = [];

    roles = roles.concat(
      await this.updateRolesWithPermissions(addToRoles, [permission])
    );
    roles = roles.concat(
      await this.removePermissionsFromRoles(removeFromRoles, [permission])
    );

    return {
      permission,
      roles
    };
  };
  // end: updatePermission helper functions

  async updatePermission(
    data: UpdatePermissionData,
    em?: EntityManager
  ): Promise<PermissionDto> {
    const { permission, roles } = await this.updatePermissionData(data);
    await (em ?? this.em).upsertMany([permission, ...roles]);
    if (!em) {
      this.em.flush();
    }
    return PermissionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      permission
    );
  }

  async updateBatchPermissions(
    data: UpdatePermissionData[],
    em?: EntityManager
  ): Promise<PermissionDto[]> {
    const rolesCache: Record<string, Role> = {};
    const permissions: Permission[] = [];
    await (em ?? this.em).transactional(async (em) => {
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

    return permissions.map((permission) =>
      PermissionDtoMapper.serializeEntityToDto(SchemaValidator(), permission)
    );
  }

  async deletePermission(id: string, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Permission, { id });
  }

  async deletePermissions(ids: string[], em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Permission, { id: { $in: ids } });
  }
}
