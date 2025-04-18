import {
  MetricsDefinition,
  OpenTelemetryCollector
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
  #mapperss: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mapperss>,
    Entities,
    Dto
  >;

  constructor(
    public em: EntityManager,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected mapperss: {
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
    }
  ) {
    this.#mapperss = transformIntoInternalDtoMapper(mapperss, schemaValidator);
  }

  async createRole(
    roleDto: Dto['CreateRoleDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper']> {
    // TODO: Think about removing static method here, since we need specific args
    const role =
      this.#mapperss.CreateRoleDtoMapper.deserializeDtoToEntity(roleDto);
    await (em ?? this.em).transactional((em) => em.persist(role));
    return this.#mapperss.RoleDtoMapper.serializeEntityToDto(
      role as Entities['RoleDtoMapper']
    );
  }

  async createBatchRoles(
    roleDtos: Dto['CreateRoleDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper'][]> {
    const roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        this.#mapperss.CreateRoleDtoMapper.deserializeDtoToEntity(roleDto)
      )
    );
    await (em ?? this.em).transactional((em) => em.persist(roles));
    return roles.map((role) =>
      this.#mapperss.RoleDtoMapper.serializeEntityToDto(
        role as Entities['RoleDtoMapper']
      )
    );
  }

  async getRole(idDto: IdDto, em?: EntityManager): Promise<RoleDto> {
    const role = await (em ?? this.em).findOneOrFail('Role', idDto, {
      populate: ['id', '*']
    });
    return this.#mapperss.RoleDtoMapper.serializeEntityToDto(
      role as Entities['RoleDtoMapper']
    );
  }

  async getBatchRoles(idsDto: IdsDto, em?: EntityManager): Promise<RoleDto[]> {
    return (
      await (em ?? this.em).find('Role', idsDto, {
        populate: ['id', '*']
      })
    ).map((role) =>
      this.#mapperss.RoleDtoMapper.serializeEntityToDto(
        role as Entities['RoleDtoMapper']
      )
    );
  }

  async updateRole(
    roleDto: Dto['UpdateRoleDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper']> {
    let role = this.#mapperss.UpdateRoleDtoMapper.deserializeDtoToEntity(
      roleDto
    ) as Entities['RoleDtoMapper'];
    await (em ?? this.em).transactional(async (em) => {
      role = (await em.upsert('Role', role)) as Entities['RoleDtoMapper'];
    });
    return this.#mapperss.RoleDtoMapper.serializeEntityToDto(role);
  }

  async updateBatchRoles(
    roleDtos: Dto['UpdateRoleDtoMapper'][],
    em?: EntityManager
  ): Promise<Dto['RoleDtoMapper'][]> {
    let roles = await Promise.all(
      roleDtos.map(async (roleDto) =>
        this.#mapperss.UpdateRoleDtoMapper.deserializeDtoToEntity(roleDto)
      )
    );
    await (em ?? this.em).transactional(async (em) => {
      roles = await em.upsertMany('Role', roles);
    });
    return roles.map((role) =>
      this.#mapperss.RoleDtoMapper.serializeEntityToDto(
        role as Entities['RoleDtoMapper']
      )
    );
  }

  async deleteRole(idDto: IdDto, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete('Role', idDto);
  }

  async deleteBatchRoles(idsDto: IdsDto, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete('Role', { id: { $in: idsDto.ids } });
  }
}
