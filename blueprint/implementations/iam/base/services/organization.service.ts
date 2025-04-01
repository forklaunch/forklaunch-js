import {
  CreateOrganizationDto,
  OrganizationDto,
  OrganizationService,
  UpdateOrganizationDto
} from '@forklaunch/blueprint-iam-interfaces';
import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  InternalDtoMapper,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export default class BaseOrganizationService<
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
    OrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
    CreateOrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
    UpdateOrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
  } = {
    OrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
    CreateOrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
    UpdateOrganizationDtoMapper: OrganizationDto<OrganizationStatus>;
  }
> implements OrganizationService<OrganizationStatus>
{
  #dtoMappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    public em: EntityManager,
    private readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    private readonly schemaValidator: SchemaValidator,
    private readonly dtoMappers: {
      OrganizationDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['OrganizationDtoMapper'];
        _Entity: Entities['OrganizationDtoMapper'];
        serializeEntityToDto: unknown;
      };
      CreateOrganizationDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['CreateOrganizationDtoMapper'];
        _Entity: Entities['CreateOrganizationDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
      UpdateOrganizationDtoMapper: new (schemaValidator: SchemaValidator) => {
        dto: Dto['UpdateOrganizationDtoMapper'];
        _Entity: Entities['UpdateOrganizationDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
    }
  ) {
    this.#dtoMappers = transformIntoInternalDtoMapper(
      dtoMappers,
      schemaValidator
    );
  }

  async createOrganization(
    organizationDto: Dto['CreateOrganizationDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['OrganizationDtoMapper']> {
    this.openTelemetryCollector.log('info', 'Creating organization');
    const organization =
      this.#dtoMappers.CreateOrganizationDtoMapper.deserializeDtoToEntity(
        organizationDto
      );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(organization);
    });

    return this.#dtoMappers.OrganizationDtoMapper.serializeEntityToDto(
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
    return this.#dtoMappers.OrganizationDtoMapper.serializeEntityToDto(
      organization as Entities['OrganizationDtoMapper']
    );
  }

  async updateOrganization(
    organizationDto: Dto['UpdateOrganizationDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['OrganizationDtoMapper']> {
    const updatedOrganization =
      this.#dtoMappers.UpdateOrganizationDtoMapper.deserializeDtoToEntity(
        organizationDto
      );
    await (em ?? this.em).upsert(updatedOrganization);
    return this.#dtoMappers.OrganizationDtoMapper.serializeEntityToDto(
      updatedOrganization
    );
  }

  async deleteOrganization(idDto: IdDto, em?: EntityManager): Promise<void> {
    await (em ?? this.em).nativeDelete('Organization', idDto);
  }
}
