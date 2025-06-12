import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
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
    },
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async createOrganization(
    organizationDto: Dto['CreateOrganizationDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['OrganizationDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating organization',
        organizationDto
      );
    }

    const organization =
      await this.#mappers.CreateOrganizationDtoMapper.deserializeDtoToEntity(
        organizationDto,
        em ?? this.em
      );

    if (em) {
      await em.persist(organization);
    } else {
      await this.em.persistAndFlush(organization);
    }

    return this.#mappers.OrganizationDtoMapper.serializeEntityToDto(
      organization
    );
  }

  async getOrganization(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['OrganizationDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting organization', idDto);
    }

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
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Updating organization',
        organizationDto
      );
    }

    const updatedOrganization =
      await this.#mappers.UpdateOrganizationDtoMapper.deserializeDtoToEntity(
        organizationDto,
        em ?? this.em
      );

    if (em) {
      await em.persist(updatedOrganization);
    } else {
      await this.em.persistAndFlush(updatedOrganization);
    }

    return this.#mappers.OrganizationDtoMapper.serializeEntityToDto(
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
