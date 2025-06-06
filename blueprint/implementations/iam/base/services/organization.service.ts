import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import { MapNestedDtoArraysToCollections } from '@forklaunch/core/services';
import { OrganizationService } from '@forklaunch/interfaces-iam/interfaces';
import {
  CreateOrganizationDto,
  OrganizationDto,
  UpdateOrganizationDto
} from '@forklaunch/interfaces-iam/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BaseOrganizationService<
  SchemaValidator extends AnySchemaValidator,
  OrganizationStatus,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    OrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
    CreateOrganizationDtoMapper: CreateOrganizationDto;
    UpdateOrganizationDtoMapper: UpdateOrganizationDto;
  } = {
    OrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
    CreateOrganizationDtoMapper: CreateOrganizationDto;
    UpdateOrganizationDtoMapper: UpdateOrganizationDto;
  },
  Entities extends {
    OrganizationDtoMapper: MapNestedDtoArraysToCollections<
      OrganizationDto<OrganizationStatus>,
      'users'
    >;
    CreateOrganizationDtoMapper: MapNestedDtoArraysToCollections<
      OrganizationDto<OrganizationStatus>,
      'users'
    >;
    UpdateOrganizationDtoMapper: MapNestedDtoArraysToCollections<
      OrganizationDto<OrganizationStatus>,
      'users'
    >;
  } = {
    OrganizationDtoMapper: MapNestedDtoArraysToCollections<
      OrganizationDto<OrganizationStatus>,
      'users'
    >;
    CreateOrganizationDtoMapper: MapNestedDtoArraysToCollections<
      OrganizationDto<OrganizationStatus>,
      'users'
    >;
    UpdateOrganizationDtoMapper: MapNestedDtoArraysToCollections<
      OrganizationDto<OrganizationStatus>,
      'users'
    >;
  }
> implements OrganizationService<OrganizationStatus>
{
  #mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>,
    Entities,
    Dto
  >;

  constructor(
    public em: EntityManager,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
      OrganizationDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['OrganizationDtoMapper'],
        Entities['OrganizationDtoMapper']
      >;
      CreateOrganizationDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateOrganizationDtoMapper'],
        Entities['CreateOrganizationDtoMapper']
      >;
      UpdateOrganizationDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateOrganizationDtoMapper'],
        Entities['UpdateOrganizationDtoMapper']
      >;
    }
  ) {
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
  }

  async createOrganization(
    organizationDto: Dto['CreateOrganizationDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['OrganizationDtoMapper']> {
    this.openTelemetryCollector.log('info', 'Creating organization');
    const organization =
      await this.#mappers.CreateOrganizationDtoMapper.deserializeDtoToEntity(
        organizationDto
      );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(organization);
    });

    return this.#mappers.OrganizationDtoMapper.serializeEntityToDto(
      organization
    );
  }

  async getOrganization(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['OrganizationDtoMapper']> {
    const organization = await (em ?? this.em).findOneOrFail(
      'Organization',
      idDto
    );
    return this.#mappers.OrganizationDtoMapper.serializeEntityToDto(
      organization as Entities['OrganizationDtoMapper']
    );
  }

  async updateOrganization(
    organizationDto: Dto['UpdateOrganizationDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['OrganizationDtoMapper']> {
    const updatedOrganization =
      await this.#mappers.UpdateOrganizationDtoMapper.deserializeDtoToEntity(
        organizationDto
      );
    await (em ?? this.em).upsert(updatedOrganization);
    return this.#mappers.OrganizationDtoMapper.serializeEntityToDto(
      updatedOrganization
    );
  }

  async deleteOrganization(idDto: IdDto, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete('Organization', idDto);
  }
}
