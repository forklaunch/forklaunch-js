import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { RoleService } from '@forklaunch/interfaces-iam/interfaces';
import { EntityManager } from '@mikro-orm/core';

import { IdDto, IdsDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import { MapNestedDtoArraysToCollections } from '@forklaunch/core/services';
import {
  CreateRoleDto,
  RoleDto,
  UpdateRoleDto
} from '@forklaunch/interfaces-iam/types';
import { AnySchemaValidator } from '@forklaunch/validator';

export class BaseRoleService<
  SchemaValidator extends AnySchemaValidator,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    RoleDtoMapper: RoleDto;
    CreateRoleDtoMapper: CreateRoleDto;
    UpdateRoleDtoMapper: UpdateRoleDto;
  } = {
    RoleDtoMapper: RoleDto;
    CreateRoleDtoMapper: CreateRoleDto;
    UpdateRoleDtoMapper: UpdateRoleDto;
  },
  Entities extends {
    RoleDtoMapper: MapNestedDtoArraysToCollections<RoleDto, 'permissions'>;
    CreateRoleDtoMapper: MapNestedDtoArraysToCollections<
      RoleDto,
      'permissions'
    >;
    UpdateRoleDtoMapper: MapNestedDtoArraysToCollections<
      RoleDto,
      'permissions'
    >;
  } = {
    RoleDtoMapper: MapNestedDtoArraysToCollections<RoleDto, 'permissions'>;
    CreateRoleDtoMapper: MapNestedDtoArraysToCollections<
      RoleDto,
      'permissions'
    >;
    UpdateRoleDtoMapper: MapNestedDtoArraysToCollections<
      RoleDto,
      'permissions'
    >;
  }
> implements RoleService
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
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
      RoleDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['RoleDtoMapper'],
        Entities['RoleDtoMapper']
      >;
      CreateRoleDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateRoleDtoMapper'],
        Entities['CreateRoleDtoMapper']
      >;
      UpdateRoleDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateRoleDtoMapper'],
        Entities['UpdateRoleDtoMapper']
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

  async createRole(
    roleDto: Dto['CreateRoleDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating role', roleDto);
    }
    const role = await this._mappers.CreateRoleDtoMapper.deserializeDtoToEntity(
      roleDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(role);
    } else {
      await this.em.persistAndFlush(role);
    }

    return this._mappers.RoleDtoMapper.serializeEntityToDto(role);
  }

  async createBatchRoles(
    roleDtos: Dto['CreateRoleDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating batch roles', roleDtos);
    }

    const roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        this._mappers.CreateRoleDtoMapper.deserializeDtoToEntity(
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
        this._mappers.RoleDtoMapper.serializeEntityToDto(role)
      )
    );
  }

  async getRole({ id }: IdDto, em?: EntityManager): Promise<RoleDto> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting role', { id });
    }

    const role = await (em ?? this.em).findOneOrFail('Role', id, {
      populate: ['id', '*']
    });

    return this._mappers.RoleDtoMapper.serializeEntityToDto(
      role as Entities['RoleDtoMapper']
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
        this._mappers.RoleDtoMapper.serializeEntityToDto(
          role as Entities['RoleDtoMapper']
        )
      )
    );
  }

  async updateRole(
    roleDto: Dto['UpdateRoleDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating role', roleDto);
    }

    const role = await this._mappers.UpdateRoleDtoMapper.deserializeDtoToEntity(
      roleDto,
      em ?? this.em
    );

    if (em) {
      await em.persist(role);
    } else {
      await this.em.persistAndFlush(role);
    }

    return this._mappers.RoleDtoMapper.serializeEntityToDto(role);
  }

  async updateBatchRoles(
    roleDtos: Dto['UpdateRoleDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating batch roles', roleDtos);
    }

    const roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        this._mappers.UpdateRoleDtoMapper.deserializeDtoToEntity(
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
        this._mappers.RoleDtoMapper.serializeEntityToDto(
          role as Entities['RoleDtoMapper']
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
