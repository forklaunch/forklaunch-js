import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { RoleService } from '@forklaunch/interfaces-iam/interfaces';
import { EntityManager } from '@mikro-orm/core';

import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import { RoleDto } from '@forklaunch/interfaces-iam/types';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { RoleDtos } from '../domain/types/iamDto.types';
import { RoleEntities } from '../domain/types/iamEntities.types';

export class BaseRoleService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends RoleEntities,
  MapperDto extends RoleDtos = RoleDtos
> implements RoleService
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: {
    RoleMapper: ResponseMapperConstructor<
      SchemaValidator,
      MapperDto['RoleMapper'],
      MapperEntities['RoleMapper']
    >;
    CreateRoleMapper: RequestMapperConstructor<
      SchemaValidator,
      MapperDto['CreateRoleMapper'],
      MapperEntities['CreateRoleMapper'],
      (
        dto: MapperDto['CreateRoleMapper'],
        em: EntityManager
      ) => Promise<MapperEntities['CreateRoleMapper']>
    >;
    UpdateRoleMapper: RequestMapperConstructor<
      SchemaValidator,
      MapperDto['UpdateRoleMapper'],
      MapperEntities['UpdateRoleMapper'],
      (
        dto: MapperDto['UpdateRoleMapper'],
        em: EntityManager
      ) => Promise<MapperEntities['UpdateRoleMapper']>
    >;
  };

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: {
      RoleMapper: ResponseMapperConstructor<
        SchemaValidator,
        MapperDto['RoleMapper'],
        MapperEntities['RoleMapper']
      >;
      CreateRoleMapper: RequestMapperConstructor<
        SchemaValidator,
        MapperDto['CreateRoleMapper'],
        MapperEntities['CreateRoleMapper'],
        (
          dto: MapperDto['CreateRoleMapper'],
          em: EntityManager
        ) => Promise<MapperEntities['CreateRoleMapper']>
      >;
      UpdateRoleMapper: RequestMapperConstructor<
        SchemaValidator,
        MapperDto['UpdateRoleMapper'],
        MapperEntities['UpdateRoleMapper'],
        (
          dto: MapperDto['UpdateRoleMapper'],
          em: EntityManager
        ) => Promise<MapperEntities['UpdateRoleMapper']>
      >;
    },
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.em = em;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async createRole(
    roleDto: MapperDto['CreateRoleMapper'],
    em?: EntityManager
  ): Promise<MapperDto['RoleMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating role', roleDto);
    }
    const role = await this._mappers.CreateRoleMapper.deserializeDtoToEntity(
      roleDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(role);
    } else {
      await this.em.persistAndFlush(role);
    }

    return this._mappers.RoleMapper.serializeEntityToDto(role);
  }

  async createBatchRoles(
    roleDtos: MapperDto['CreateRoleMapper'][],
    em?: EntityManager
  ): Promise<MapperDto['RoleMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating batch roles', roleDtos);
    }

    const roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        this._mappers.CreateRoleMapper.deserializeDtoToEntity(
          roleDto,
          em ?? this.em
        )
      )
    );

    if (em) {
      await em.persist(roles);
    } else {
      await this.em.persistAndFlush(roles);
    }

    return Promise.all(
      roles.map((role) => this._mappers.RoleMapper.serializeEntityToDto(role))
    );
  }

  async getRole({ id }: IdDto, em?: EntityManager): Promise<RoleDto> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting role', { id });
    }

    const role = await (em ?? this.em).findOneOrFail('Role', id, {
      populate: ['id', '*']
    });

    return this._mappers.RoleMapper.serializeEntityToDto(
      role as MapperEntities['RoleMapper']
    );
  }

  async getBatchRoles({ ids }: IdsDto, em?: EntityManager): Promise<RoleDto[]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting batch roles', { ids });
    }

    return Promise.all(
      (
        await (em ?? this.em).find(
          'Role',
          {
            id: { $in: ids }
          },
          {
            populate: ['id', '*']
          }
        )
      ).map((role) =>
        this._mappers.RoleMapper.serializeEntityToDto(
          role as MapperEntities['RoleMapper']
        )
      )
    );
  }

  async updateRole(
    roleDto: MapperDto['UpdateRoleMapper'],
    em?: EntityManager
  ): Promise<MapperDto['RoleMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating role', roleDto);
    }

    const role = await this._mappers.UpdateRoleMapper.deserializeDtoToEntity(
      roleDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(role);
    } else {
      await this.em.persistAndFlush(role);
    }

    return this._mappers.RoleMapper.serializeEntityToDto(role);
  }

  async updateBatchRoles(
    roleDtos: MapperDto['UpdateRoleMapper'][],
    em?: EntityManager
  ): Promise<MapperDto['RoleMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating batch roles', roleDtos);
    }

    const roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        this._mappers.UpdateRoleMapper.deserializeDtoToEntity(
          roleDto,
          em ?? this.em
        )
      )
    );

    if (em) {
      await em.persist(roles);
    } else {
      await this.em.persistAndFlush(roles);
    }
    return Promise.all(
      roles.map((role) =>
        this._mappers.RoleMapper.serializeEntityToDto(
          role as MapperEntities['RoleMapper']
        )
      )
    );
  }

  async deleteRole(idDto: IdDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting role', idDto);
    }

    await (em ?? this.em).nativeDelete('Role', idDto);
  }

  async deleteBatchRoles(idsDto: IdsDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting batch roles', idsDto);
    }

    await (em ?? this.em).nativeDelete('Role', { id: { $in: idsDto.ids } });
  }
}
