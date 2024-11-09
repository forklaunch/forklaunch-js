import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import { PermissionService } from '../interfaces/permissionService.interface';
import { RoleService } from '../interfaces/roleService.interface';
import {
  CreateRoleDto,
  CreateRoleDtoMapper,
  RoleDto,
  RoleDtoMapper,
  UpdateRoleDto,
  UpdateRoleDtoMapper
} from '../models/dtoMapper/role.dtoMapper';
import { Role } from '../models/persistence/role.entity';

export default class BaseRoleService implements RoleService {
  private permissionService: PermissionService;

  constructor(
    public em: EntityManager,
    permissionService: () => PermissionService
  ) {
    this.permissionService = permissionService();
  }

  async createRole(
    roleDto: CreateRoleDto,
    em?: EntityManager
  ): Promise<RoleDto> {
    // TODO: Think about removing static method here, since we need specific args
    const role = CreateRoleDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      roleDto,
      roleDto.permissionIds
        ? await this.permissionService.getBatchPermissions(
            roleDto.permissionIds,
            em
          )
        : []
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
          roleDto.permissionIds
            ? await this.permissionService.getBatchPermissions(
                roleDto.permissionIds,
                em
              )
            : []
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
      roleDto.permissionIds
        ? await this.permissionService.getBatchPermissions(
            roleDto.permissionIds,
            em
          )
        : []
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
          roleDto.permissionIds
            ? await this.permissionService.getBatchPermissions(
                roleDto.permissionIds,
                em
              )
            : []
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

  async deleteRoles(ids: string[], em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete(Role, { id: { $in: ids } });
  }
}
