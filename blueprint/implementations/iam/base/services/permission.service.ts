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
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { PermissionDtos } from '../domain/types/iamDto.types';
import { PermissionEntities } from '../domain/types/iamEntities.types';

export class BasePermissionService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends PermissionEntities,
  MapperDto extends PermissionDtos = PermissionDtos
> implements PermissionService
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };

  constructor(
    public em: EntityManager,
    protected roleServiceFactory: () => RoleService,
    protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
      PermissionMapper: ResponseMapperConstructor<
        SchemaValidator,
        MapperDto['PermissionMapper'],
        MapperEntities['PermissionMapper']
      >;
      CreatePermissionMapper: RequestMapperConstructor<
        SchemaValidator,
        MapperDto['CreatePermissionMapper'],
        MapperEntities['CreatePermissionMapper'],
        (
          dto: MapperDto['CreatePermissionMapper'],
          em: EntityManager
        ) => Promise<MapperEntities['CreatePermissionMapper']>
      >;
      UpdatePermissionMapper: RequestMapperConstructor<
        SchemaValidator,
        MapperDto['UpdatePermissionMapper'],
        MapperEntities['UpdatePermissionMapper'],
        (
          dto: MapperDto['UpdatePermissionMapper'],
          em: EntityManager
        ) => Promise<MapperEntities['UpdatePermissionMapper']>
      >;
      RoleEntityMapper: RequestMapperConstructor<
        SchemaValidator,
        MapperDto['RoleEntityMapper'],
        MapperEntities['RoleEntityMapper'],
        (
          dto: MapperDto['RoleEntityMapper'],
          em: EntityManager
        ) => Promise<MapperEntities['RoleEntityMapper']>
      >;
    },
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
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
    roles: MapperEntities['RoleEntityMapper'][],
    permissions: MapperEntities['PermissionMapper'][]
  ): Promise<MapperEntities['RoleEntityMapper'][]> {
    return Promise.all(
      roles.map(async (role) => {
        permissions.forEach((permission) => role.permissions.add(permission));
        return role;
      })
    );
  }

  private async removePermissionsFromRoles(
    roles: MapperEntities['RoleEntityMapper'][],
    permissions: MapperEntities['PermissionMapper'][]
  ): Promise<MapperEntities['RoleEntityMapper'][]> {
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
  ): Promise<MapperEntities['RoleEntityMapper'][]> {
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
    permission: MapperEntities['PermissionMapper'];
    addToRoles: MapperEntities['RoleEntityMapper'][];
  }): Promise<{
    permission: MapperEntities['PermissionMapper'];
    roles: MapperEntities['RoleEntityMapper'][];
  }> {
    let roles: MapperEntities['RoleEntityMapper'][] = [];
    if (addToRoles) {
      roles = await this.updateRolesWithPermissions(addToRoles, [permission]);
    }

    return { permission, roles };
  }

  private async extractCreatePermissionDtoToEntityData(
    permissionDto: MapperDto['CreatePermissionMapper'],
    em?: EntityManager
  ): Promise<{
    permission: MapperEntities['PermissionMapper'];
    addToRoles: MapperEntities['RoleEntityMapper'][];
  }> {
    return {
      permission: (em ?? this.em).merge(
        await this._mappers.CreatePermissionMapper.deserializeDtoToEntity(
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
    createPermissionDto: MapperDto['CreatePermissionMapper'],
    em?: EntityManager
  ): Promise<MapperDto['PermissionMapper']> {
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

    return this._mappers.PermissionMapper.serializeEntityToDto(permission);
  }

  async createBatchPermissions(
    permissionDtos: MapperDto['CreatePermissionMapper'][],
    em?: EntityManager
  ): Promise<MapperDto['PermissionMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating batch permissions',
        permissionDtos
      );
    }
    const rolesCache: Record<string, MapperEntities['RoleEntityMapper']> = {};
    const permissions: MapperEntities['PermissionMapper'][] = [];
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
        this._mappers.PermissionMapper.serializeEntityToDto(permission)
      )
    );
  }

  async getPermission(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<MapperDto['PermissionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting permission', idDto);
    }
    const permission = await (em ?? this.em).findOneOrFail('Permission', idDto);
    return this._mappers.PermissionMapper.serializeEntityToDto(
      permission as MapperEntities['PermissionMapper']
    );
  }

  async getBatchPermissions(
    idsDto: IdsDto,
    em?: EntityManager
  ): Promise<MapperDto['PermissionMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting batch permissions', idsDto);
    }
    return Promise.all(
      (await (em ?? this.em).find('Permission', idsDto)).map((permission) =>
        this._mappers.PermissionMapper.serializeEntityToDto(
          permission as MapperEntities['PermissionMapper']
        )
      )
    );
  }

  // start: updatePermission helper functions
  private updatePermissionDto = async (
    permissionDto: MapperDto['UpdatePermissionMapper'],
    em?: EntityManager
  ): Promise<{
    permission: MapperEntities['PermissionMapper'];
    roles: MapperEntities['RoleEntityMapper'][];
  }> => {
    const permission =
      await this._mappers.UpdatePermissionMapper.deserializeDtoToEntity(
        permissionDto,
        em ?? this.em
      );
    const addToRoles = permissionDto.addToRolesIds
      ? await this.getBatchRoles({ ids: permissionDto.addToRolesIds }, em)
      : [];
    const removeFromRoles = permissionDto.removeFromRolesIds
      ? await this.getBatchRoles({ ids: permissionDto.removeFromRolesIds }, em)
      : [];

    let roles: MapperEntities['RoleEntityMapper'][] = [];

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
    permissionDto: MapperDto['UpdatePermissionMapper'],
    em?: EntityManager
  ): Promise<MapperDto['PermissionMapper']> {
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

    return this._mappers.PermissionMapper.serializeEntityToDto(permission);
  }

  async updateBatchPermissions(
    permissionDtos: MapperDto['UpdatePermissionMapper'][],
    em?: EntityManager
  ): Promise<MapperDto['PermissionMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Updating batch permissions',
        permissionDtos
      );
    }
    const rolesCache: Record<string, MapperEntities['RoleEntityMapper']> = {};
    const permissions: MapperEntities['PermissionMapper'][] = [];
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
        this._mappers.PermissionMapper.serializeEntityToDto(permission)
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
