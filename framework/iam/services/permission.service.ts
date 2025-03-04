import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { BaseService } from '@forklaunch/core/services';
import { SchemaValidator } from '@forklaunch/framework-core';
import { ForklaunchMetrics } from '@forklaunch/framework-monitoring';
import { EntityManager } from '@mikro-orm/core';
import { PermissionService } from '../interfaces/permission.service.interface';
import { RoleService } from '../interfaces/role.service.interface';
import {
  CreatePermissionDto,
  CreatePermissionDtoMapper,
  PermissionDto,
  PermissionDtoMapper,
  UpdatePermissionDto,
  UpdatePermissionDtoMapper
} from '../models/dtoMapper/permission.dtoMapper';
import { RoleEntityMapper } from '../models/dtoMapper/role.dtoMapper';
import { Permission } from '../models/persistence/permission.entity';
import { Role } from '../models/persistence/role.entity';

type CreatePermissionEntityData = {
  permission: Permission;
  addToRoles: Role[];
};

export default class BasePermissionService
  implements PermissionService, BaseService
{
  constructor(
    public em: EntityManager,
    private roleServiceFactory: () => RoleService,
    private openTelemetryCollector: OpenTelemetryCollector<ForklaunchMetrics>
  ) {}

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

  private async getBatchRoles(
    roleIds?: string[],
    em?: EntityManager
  ): Promise<Role[]> {
    return roleIds
      ? (await this.roleServiceFactory().getBatchRoles(roleIds, em)).map(
          (role) => {
            return (em ?? this.em).merge(
              RoleEntityMapper.deserializeDtoToEntity(SchemaValidator(), role)
            );
          }
        )
      : [];
  }
  // end: global helper functions

  // start: createPermission helper functions
  private async createPermissionDto({
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

  private async extractCreatePermissionDtoToEntityData(
    permissionDto: CreatePermissionDto,
    em?: EntityManager
  ): Promise<CreatePermissionEntityData> {
    return {
      permission: (em ?? this.em).merge(
        CreatePermissionDtoMapper.deserializeDtoToEntity(
          SchemaValidator(),
          permissionDto
        )
      ),
      addToRoles: await this.getBatchRoles(permissionDto.addToRolesIds, em)
    };
  }
  // end: createPermission helper functions

  async createPermission(
    createPermissionDto: CreatePermissionDto,
    em?: EntityManager
  ): Promise<PermissionDto> {
    const { permission, roles } = await this.createPermissionDto(
      await this.extractCreatePermissionDtoToEntityData(createPermissionDto, em)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist([permission, ...roles]);
    });
    return PermissionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      permission
    );
  }

  async createBatchPermissions(
    permissionDtos: CreatePermissionDto[],
    em?: EntityManager
  ): Promise<PermissionDto[]> {
    const rolesCache: Record<string, Role> = {};
    const permissions: Permission[] = [];
    await (em ?? this.em).transactional(async (em) => {
      permissionDtos.map(async (createPermissionDto) => {
        const { permission, roles } = await this.createPermissionDto(
          await this.extractCreatePermissionDtoToEntityData(
            createPermissionDto,
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
      await (em ?? this.em).persist([
        ...permissions,
        ...Object.values(rolesCache)
      ]);
    });

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
  private updatePermissionDto = async (
    permissionDto: UpdatePermissionDto,
    em?: EntityManager
  ): Promise<{
    permission: Permission;
    roles: Role[];
  }> => {
    const permission = UpdatePermissionDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      permissionDto
    );
    const addToRoles = await this.getBatchRoles(
      permissionDto.addToRolesIds,
      em
    );
    const removeFromRoles = await this.getBatchRoles(
      permissionDto.removeFromRolesIds,
      em
    );

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
    permissionDto: UpdatePermissionDto,
    em?: EntityManager
  ): Promise<PermissionDto> {
    const { permission, roles } = await this.updatePermissionDto(permissionDto);
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
    permissionDtos: UpdatePermissionDto[],
    em?: EntityManager
  ): Promise<PermissionDto[]> {
    const rolesCache: Record<string, Role> = {};
    const permissions: Permission[] = [];
    await (em ?? this.em).transactional(async (em) => {
      permissionDtos.map(async (updatePermissionDto) => {
        const { permission, roles } =
          await this.updatePermissionDto(updatePermissionDto);
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
      await (em ?? this.em).persist([
        ...permissions,
        ...Object.values(rolesCache)
      ]);
    });

    return permissions.map((permission) =>
      PermissionDtoMapper.serializeEntityToDto(SchemaValidator(), permission)
    );
  }

  async deletePermission(id: string, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Permission, { id });
  }

  async deleteBatchPermissions(
    ids: string[],
    em?: EntityManager
  ): Promise<void> {
    await (em ?? this.em).nativeDelete(Permission, { id: { $in: ids } });
  }
}
