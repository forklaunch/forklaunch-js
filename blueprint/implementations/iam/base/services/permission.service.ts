import {
  PermissionService,
  RoleService
} from '@forklaunch/interfaces-iam/interfaces';

import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import { MapNestedDtoArraysToCollections } from '@forklaunch/core/services';
import {
  CreatePermissionDto,
  PermissionDto,
  UpdatePermissionDto,
  UpdateRoleDto
} from '@forklaunch/interfaces-iam/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BasePermissionService<
  SchemaValidator extends AnySchemaValidator,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: CreatePermissionDto;
    UpdatePermissionDtoMapper: UpdatePermissionDto;
    RoleEntityMapper: UpdateRoleDto;
  } = {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: CreatePermissionDto;
    UpdatePermissionDtoMapper: UpdatePermissionDto;
    RoleEntityMapper: UpdateRoleDto;
  },
  Entities extends {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: PermissionDto;
    UpdatePermissionDtoMapper: PermissionDto;
    RoleEntityMapper: MapNestedDtoArraysToCollections<
      UpdateRoleDto,
      'permissions'
    >;
  } = {
    PermissionDtoMapper: PermissionDto;
    CreatePermissionDtoMapper: PermissionDto;
    UpdatePermissionDtoMapper: PermissionDto;
    RoleEntityMapper: MapNestedDtoArraysToCollections<
      UpdateRoleDto,
      'permissions'
    >;
  }
> implements PermissionService
{
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>,
    Entities,
    Dto
  >;
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };

  constructor(
    public em: EntityManager,
    protected roleServiceFactory: () => RoleService,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
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
      RoleEntityMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['RoleEntityMapper'],
        Entities['RoleEntityMapper']
      >;
    },
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  // start: global helper functions
  private async updateRolesWithPermissions(
    roles: Entities['RoleEntityMapper'][],
    permissions: Entities['PermissionDtoMapper'][]
  ): Promise<Entities['RoleEntityMapper'][]> {
    return Promise.all(
      roles.map(async (role) => {
        permissions.forEach((permission) => role.permissions.add(permission));
        return role;
      })
    );
  }

  private async removePermissionsFromRoles(
    roles: Entities['RoleEntityMapper'][],
    permissions: Entities['PermissionDtoMapper'][]
  ): Promise<Entities['RoleEntityMapper'][]> {
    return Promise.all(
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
  ): Promise<Entities['RoleEntityMapper'][]> {
    return roleIds
      ? await Promise.all(
          (await this.roleServiceFactory().getBatchRoles(roleIds, em)).map(
            async (role) => {
              return (em ?? this.em).merge(
                await this._mappers.RoleEntityMapper.deserializeDtoToEntity(
                  role,
                  em ?? this.em
                )
              );
            }
          )
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
    addToRoles: Entities['RoleEntityMapper'][];
  }): Promise<{
    permission: Entities['PermissionDtoMapper'];
    roles: Entities['RoleEntityMapper'][];
  }> {
    let roles: Entities['RoleEntityMapper'][] = [];
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
    addToRoles: Entities['RoleEntityMapper'][];
  }> {
    return {
      permission: (em ?? this.em).merge(
        await this._mappers.CreatePermissionDtoMapper.deserializeDtoToEntity(
          permissionDto,
          em ?? this.em
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
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating permission',
        createPermissionDto
      );
    }
    const { permission, roles } = await this.createPermissionDto(
      await this.extractCreatePermissionDtoToEntityData(createPermissionDto, em)
    );

    if (em) {
      await em.persist([permission, ...roles]);
    } else {
      await this.em.persistAndFlush([permission, ...roles]);
    }

    return this._mappers.PermissionDtoMapper.serializeEntityToDto(permission);
  }

  async createBatchPermissions(
    permissionDtos: Dto['CreatePermissionDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating batch permissions',
        permissionDtos
      );
    }
    const rolesCache: Record<string, Entities['RoleEntityMapper']> = {};
    const permissions: Entities['PermissionDtoMapper'][] = [];
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
    const entities = [...permissions, ...Object.values(rolesCache)];

    if (em) {
      await em.persist(entities);
    } else {
      await this.em.persistAndFlush(entities);
    }

    return Promise.all(
      permissions.map(async (permission) =>
        this._mappers.PermissionDtoMapper.serializeEntityToDto(permission)
      )
    );
  }

  async getPermission(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting permission', idDto);
    }
    const permission = await (em ?? this.em).findOneOrFail('Permission', idDto);
    return this._mappers.PermissionDtoMapper.serializeEntityToDto(
      permission as Entities['PermissionDtoMapper']
    );
  }

  async getBatchPermissions(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting batch permissions', idsDto);
    }
    return Promise.all(
      (await (em ?? this.em).find('Permission', idsDto)).map((permission) =>
        this._mappers.PermissionDtoMapper.serializeEntityToDto(
          permission as Entities['PermissionDtoMapper']
        )
      )
    );
  }

  // start: updatePermission helper functions
  private updatePermissionDto = async (
    permissionDto: Dto['UpdatePermissionDtoMapper'],
    em?: EntityManager
  ): Promise<{
    permission: Entities['PermissionDtoMapper'];
    roles: Entities['RoleEntityMapper'][];
  }> => {
    const permission =
      await this._mappers.UpdatePermissionDtoMapper.deserializeDtoToEntity(
        permissionDto,
        em ?? this.em
      );
    const addToRoles = permissionDto.addToRolesIds
      ? await this.getBatchRoles({ ids: permissionDto.addToRolesIds }, em)
      : [];
    const removeFromRoles = permissionDto.removeFromRolesIds
      ? await this.getBatchRoles({ ids: permissionDto.removeFromRolesIds }, em)
      : [];

    let roles: Entities['RoleEntityMapper'][] = [];

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
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating permission', permissionDto);
    }
    const { permission, roles } = await this.updatePermissionDto(permissionDto);
    const entities = await (em ?? this.em).upsertMany([permission, ...roles]);

    if (em) {
      await em.persist(entities);
    } else {
      await this.em.persistAndFlush(entities);
    }

    return this._mappers.PermissionDtoMapper.serializeEntityToDto(permission);
  }

  async updateBatchPermissions(
    permissionDtos: Dto['UpdatePermissionDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['PermissionDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Updating batch permissions',
        permissionDtos
      );
    }
    const rolesCache: Record<string, Entities['RoleEntityMapper']> = {};
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
      const entities = [...permissions, ...Object.values(rolesCache)];

      if (em) {
        await em.persist(entities);
      } else {
        await this.em.persistAndFlush(entities);
      }
    });

    return Promise.all(
      permissions.map((permission) =>
        this._mappers.PermissionDtoMapper.serializeEntityToDto(permission)
      )
    );
  }

  async deletePermission(idDto: IdDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting permission', idDto);
    }
    await (em ?? this.em).nativeDelete('Permission', idDto);
  }

  async deleteBatchPermissions(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting batch permissions', idsDto);
    }
    await (em ?? this.em).nativeDelete('Permission', {
      id: { $in: idsDto.ids }
    });
  }
}
