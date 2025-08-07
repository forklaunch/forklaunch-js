import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { OrganizationService } from '@forklaunch/interfaces-iam/interfaces';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { OrganizationDtos } from '../domain/types/iamDto.types';
import { OrganizationEntities } from '../domain/types/iamEntities.types';

export class BaseOrganizationService<
  SchemaValidator extends AnySchemaValidator,
  OrganizationStatus,
  MapperEntities extends OrganizationEntities<OrganizationStatus>,
  MapperDtos extends
    OrganizationDtos<OrganizationStatus> = OrganizationDtos<OrganizationStatus>
> implements OrganizationService<OrganizationStatus>
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
    OrganizationMapper: ResponseMapperConstructor<
      SchemaValidator,
      MapperDtos['OrganizationMapper'],
      MapperEntities['OrganizationMapper']
    >;
    CreateOrganizationMapper: RequestMapperConstructor<
      SchemaValidator,
      MapperDtos['CreateOrganizationMapper'],
      MapperEntities['CreateOrganizationMapper'],
      (
        dto: MapperDtos['CreateOrganizationMapper'],
        em: EntityManager
      ) => Promise<MapperEntities['CreateOrganizationMapper']>
    >;
    UpdateOrganizationMapper: RequestMapperConstructor<
      SchemaValidator,
      MapperDtos['UpdateOrganizationMapper'],
      MapperEntities['UpdateOrganizationMapper'],
      (
        dto: MapperDtos['UpdateOrganizationMapper'],
        em: EntityManager
      ) => Promise<MapperEntities['UpdateOrganizationMapper']>
    >;
  };

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: {
      OrganizationMapper: ResponseMapperConstructor<
        SchemaValidator,
        MapperDtos['OrganizationMapper'],
        MapperEntities['OrganizationMapper']
      >;
      CreateOrganizationMapper: RequestMapperConstructor<
        SchemaValidator,
        MapperDtos['CreateOrganizationMapper'],
        MapperEntities['CreateOrganizationMapper'],
        (
          dto: MapperDtos['CreateOrganizationMapper'],
          em: EntityManager
        ) => Promise<MapperEntities['CreateOrganizationMapper']>
      >;
      UpdateOrganizationMapper: RequestMapperConstructor<
        SchemaValidator,
        MapperDtos['UpdateOrganizationMapper'],
        MapperEntities['UpdateOrganizationMapper'],
        (
          dto: MapperDtos['UpdateOrganizationMapper'],
          em: EntityManager
        ) => Promise<MapperEntities['UpdateOrganizationMapper']>
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

  async createOrganization(
    organizationDto: MapperDtos['CreateOrganizationMapper'],
    em?: EntityManager
  ): Promise<MapperDtos['OrganizationMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating organization',
        organizationDto
      );
    }

    const organization =
      await this._mappers.CreateOrganizationMapper.deserializeDtoToEntity(
        organizationDto,
        em ?? this.em
      );

    if (em) {
      await em.persist(organization);
    } else {
      await this.em.persistAndFlush(organization);
    }

    return this._mappers.OrganizationMapper.serializeEntityToDto(organization);
  }

  async getOrganization(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<MapperDtos['OrganizationMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting organization', idDto);
    }

    const organization = await (em ?? this.em).findOneOrFail(
      'Organization',
      idDto
    );

    return this._mappers.OrganizationMapper.serializeEntityToDto(
      organization as MapperEntities['OrganizationMapper']
    );
  }

  async updateOrganization(
    organizationDto: MapperDtos['UpdateOrganizationMapper'],
    em?: EntityManager
  ): Promise<MapperDtos['OrganizationMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Updating organization',
        organizationDto
      );
    }

    const updatedOrganization =
      await this._mappers.UpdateOrganizationMapper.deserializeDtoToEntity(
        organizationDto,
        em ?? this.em
      );

    if (em) {
      await em.persist(updatedOrganization);
    } else {
      await this.em.persistAndFlush(updatedOrganization);
    }

    return this._mappers.OrganizationMapper.serializeEntityToDto(
      updatedOrganization
    );
  }

  async deleteOrganization(idDto: IdDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting organization', idDto);
    }

    if (em) {
      await em.nativeDelete('Organization', idDto);
    } else {
      await this.em.nativeDelete('Organization', idDto);
    }
  }
}
