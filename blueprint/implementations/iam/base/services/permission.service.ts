import {
  CreatePermissionDto,
  PermissionDto,
  PermissionService,
  RoleDto,
  RoleService,
  UpdatePermissionDto
} from '@forklaunch/blueprint-iam-interfaces';
import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { Collection, EntityManager } from '@mikro-orm/core';

export default class BasePermissionService<
  SchemaValidator extends AnySchemaValidator,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: CreatePermissionDto;
    UpdatePermissionDtoMapper: UpdatePermissionDto;
    RoleDtoMapper: RoleDto;
  } = {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: CreatePermissionDto;
    UpdatePermissionDtoMapper: UpdatePermissionDto;
    RoleDtoMapper: RoleDto;
  },
  Entities extends {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: PermissionDto;
    UpdatePermissionDtoMapper: PermissionDto;
    RoleDtoMapper: RoleDto & { permissions: Collection<PermissionDto> };
  } = {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: PermissionDto;
    UpdatePermissionDtoMapper: PermissionDto;
    RoleDtoMapper: RoleDto & { permissions: Collection<PermissionDto> };
  }
> implements PermissionService
{
  #dtoMappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    public em: EntityManager,
    protected roleServiceFactory: () => RoleService,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected dtoMappers: {
      PermissionDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['PermissionDtoMapper'],
        Entities['PermissionDtoMapper']
      >;
      CreatePermissionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreatePermissionDtoMapper'],
        Entities['CreatePermissionDtoMapper']
      >;
      UpdatePermissionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdatePermissionDtoMapper'],
        Entities['UpdatePermissionDtoMapper']
      >;
      RoleDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['RoleDtoMapper'],
        Entities['RoleDtoMapper']
      >;
    }
  ) {
    this.#dtoMappers = transformIntoInternalDtoMapper(
      dtoMappers,
      schemaValidator
    );
  }

  // start: global helper functions
  private async updateRolesWithPermissions(
    roles: Entities['RoleDtoMapper'][],
    permissions: Entities['PermissionDtoMapper'][]
  ): Promise<Entities['RoleDtoMapper'][]> {
    return await Promise.all(
      roles.map(async (role) => {
        permissions.forEach((permission) => role.permissions.add(permission));
        return role;
      })
    );
  }

  private async removePermissionsFromRoles(
    roles: Entities['RoleDtoMapper'][],
    permissions: Entities['PermissionDtoMapper'][]
  ): Promise<Entities['RoleDtoMapper'][]> {
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
    roleIds?: IdsDto,
    em?: EntityManager
  ): Promise<Entities['RoleDtoMapper'][]> {
    return roleIds
      ? (await this.roleServiceFactory().getBatchRoles(roleIds, em)).map(
          (role) => {
            return (em ?? this.em).merge(
              this.#dtoMappers.RoleDtoMapper.deserializeDtoToEntity(role)
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
  }: {
    permission: Entities['PermissionDtoMapper'];
    addToRoles: Entities['RoleDtoMapper'][];
  }): Promise<{
    permission: Entities['PermissionDtoMapper'];
    roles: Entities['RoleDtoMapper'][];
  }> {
    let roles: Entities['RoleDtoMapper'][] = [];
    if (addToRoles) {
      roles = await this.updateRolesWithPermissions(addToRoles, [permission]);
    }

    return { permission, roles };
  }

  private async extractCreatePermissionDtoToEntityData(
    permissionDto: Dto['CreatePermissionDtoMapper'],
    em?: EntityManager
  ): Promise<{
    permission: Entities['PermissionDtoMapper'];
    addToRoles: Entities['RoleDtoMapper'][];
  }> {
    return {
      permission: (em ?? this.em).merge(
        this.#dtoMappers.CreatePermissionDtoMapper.deserializeDtoToEntity(
          permissionDto
        )
      ),
      addToRoles: permissionDto.addToRolesIds
        ? await this.getBatchRoles({ ids: permissionDto.addToRolesIds }, em)
        : []
    };
  }
  // end: createPermission helper functions

  async createPermission(
    createPermissionDto: Dto['CreatePermissionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper']> {
    const { permission, roles } = await this.createPermissionDto(
      await this.extractCreatePermissionDtoToEntityData(createPermissionDto, em)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist([permission, ...roles]);
    });
    return this.#dtoMappers.PermissionDtoMapper.serializeEntityToDto(
      permission
    );
  }

  async createBatchPermissions(
    permissionDtos: Dto['CreatePermissionDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper'][]> {
    const rolesCache: Record<string, Entities['RoleDtoMapper']> = {};
    const permissions: Entities['PermissionDtoMapper'][] = [];
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
      this.#dtoMappers.PermissionDtoMapper.serializeEntityToDto(permission)
    );
  }

  async getPermission(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper']> {
    const permission = await (em ?? this.em).findOneOrFail('Permission', idDto);
    return this.#dtoMappers.PermissionDtoMapper.serializeEntityToDto(
      permission as Entities['PermissionDtoMapper']
    );
  }

  async getBatchPermissions(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper'][]> {
    return (await (em ?? this.em).find('Permission', idsDto)).map(
      (permission) =>
        this.#dtoMappers.PermissionDtoMapper.serializeEntityToDto(
          permission as Entities['PermissionDtoMapper']
        )
    );
  }

  // start: updatePermission helper functions
  private updatePermissionDto = async (
    permissionDto: Dto['UpdatePermissionDtoMapper'],
    em?: EntityManager
  ): Promise<{
    permission: Entities['PermissionDtoMapper'];
    roles: Entities['RoleDtoMapper'][];
  }> => {
    const permission =
      this.#dtoMappers.UpdatePermissionDtoMapper.deserializeDtoToEntity(
        permissionDto
      );
    const addToRoles = permissionDto.addToRolesIds
      ? await this.getBatchRoles({ ids: permissionDto.addToRolesIds }, em)
      : [];
    const removeFromRoles = permissionDto.removeFromRolesIds
      ? await this.getBatchRoles({ ids: permissionDto.removeFromRolesIds }, em)
      : [];

    let roles: Entities['RoleDtoMapper'][] = [];

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
    permissionDto: Dto['UpdatePermissionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper']> {
    const { permission, roles } = await this.updatePermissionDto(permissionDto);
    await (em ?? this.em).upsertMany([permission, ...roles]);
    if (!em) {
      this.em.flush();
    }
    return this.#dtoMappers.PermissionDtoMapper.serializeEntityToDto(
      permission
    );
  }

  async updateBatchPermissions(
    permissionDtos: Dto['UpdatePermissionDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper'][]> {
    const rolesCache: Record<string, Entities['RoleDtoMapper']> = {};
    const permissions: Entities['PermissionDtoMapper'][] = [];
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
      this.#dtoMappers.PermissionDtoMapper.serializeEntityToDto(permission)
    );
  }

  async deletePermission(idDto: IdDto, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete('Permission', idDto);
  }

  async deleteBatchPermissions(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<void> {
    await (em ?? this.em).nativeDelete('Permission', {
      id: { $in: idsDto.ids }
    });
  }
}
