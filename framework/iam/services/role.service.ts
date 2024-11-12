import { BaseService } from '@forklaunch/core/services';
import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import { PermissionService } from '../interfaces/permission.service.interface';
import { RoleService } from '../interfaces/role.service.interface';
import { PermissionEntityMapper } from '../models/dtoMapper/permission.dtoMapper';
import {
  CreateRoleDto,
  CreateRoleDtoMapper,
  RoleDto,
  RoleDtoMapper,
  UpdateRoleDto,
  UpdateRoleDtoMapper
} from '../models/dtoMapper/role.dtoMapper';
import { Permission } from '../models/persistence/permission.entity';
import { Role } from '../models/persistence/role.entity';

export default class BaseRoleService implements RoleService, BaseService {
  private permissionService: PermissionService;

  constructor(
    public em: EntityManager,
    permissionService: () => PermissionService
  ) {
    this.permissionService = permissionService();
  }

  private async getBatchPermissions(
    permissionIds?: string[],
    em?: EntityManager
  ): Promise<Permission[]> {
    return permissionIds
      ? (
          await this.permissionService.getBatchPermissions(permissionIds, em)
        ).map((permission) => {
          return PermissionEntityMapper.deserializeDtoToEntity(
            SchemaValidator(),
            permission
          );
        })
      : [];
  }

  async createRole(
    roleDto: CreateRoleDto,
    em?: EntityManager
  ): Promise<RoleDto> {
    // TODO: Think about removing static method here, since we need specific args
    const role = CreateRoleDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      roleDto,
      await this.getBatchPermissions(roleDto.permissionIds, em)
    );
    await (em ?? this.em).transactional((em) => em.persist(role));
    return RoleDtoMapper.serializeEntityToDto(SchemaValidator(), role);
  }

  async createBatchRoles(
    roleDtos: CreateRoleDto[],
    em?: EntityManager
  ): Promise<RoleDto[]> {
    const roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        CreateRoleDtoMapper.deserializeDtoToEntity(
          SchemaValidator(),
          roleDto,
          await this.getBatchPermissions(roleDto.permissionIds, em)
        )
      )
    );
    await (em ?? this.em).transactional((em) => em.persist(roles));
    return roles.map((role) =>
      RoleDtoMapper.serializeEntityToDto(SchemaValidator(), role)
    );
  }

  async getRole(id: string, em?: EntityManager): Promise<RoleDto> {
    return RoleDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Role, { id })
    );
  }

  async getBatchRoles(ids: string[], em?: EntityManager): Promise<RoleDto[]> {
    return (await (em ?? this.em).find(Role, ids)).map((role) =>
      RoleDtoMapper.serializeEntityToDto(SchemaValidator(), role)
    );
  }

  async updateRole(
    roleDto: UpdateRoleDto,
    em?: EntityManager
  ): Promise<RoleDto> {
    let role = UpdateRoleDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      roleDto,
      await this.getBatchPermissions(roleDto.permissionIds, em)
    );
    await (em ?? this.em).transactional(async (em) => {
      role = await em.upsert(Role, role);
    });
    return RoleDtoMapper.serializeEntityToDto(SchemaValidator(), role);
  }

  async updateBatchRoles(
    roleDtos: UpdateRoleDto[],
    em?: EntityManager
  ): Promise<RoleDto[]> {
    let roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        UpdateRoleDtoMapper.deserializeDtoToEntity(
          SchemaValidator(),
          roleDto,
          await this.getBatchPermissions(roleDto.permissionIds, em)
        )
      )
    );
    await (em ?? this.em).transactional(async (em) => {
      roles = await em.upsertMany(Role, roles);
    });
    return roles.map((role) =>
      RoleDtoMapper.serializeEntityToDto(SchemaValidator(), role)
    );
  }

  async deleteRole(id: string, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Role, { id });
  }

  async deleteBatchRoles(ids: string[], em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Role, { id: { $in: ids } });
  }
}
