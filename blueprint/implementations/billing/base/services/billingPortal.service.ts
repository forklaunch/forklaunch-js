import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
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
import { BillingPortalService } from '@forklaunch/interfaces-billing/interfaces';
import {
  BillingPortalDto,
  CreateBillingPortalDto,
  UpdateBillingPortalDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BaseBillingPortalService<
  SchemaValidator extends AnySchemaValidator,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    BillingPortalDtoMapper: BillingPortalDto;
    CreateBillingPortalDtoMapper: CreateBillingPortalDto;
    UpdateBillingPortalDtoMapper: UpdateBillingPortalDto;
  } = {
    BillingPortalDtoMapper: BillingPortalDto;
    CreateBillingPortalDtoMapper: CreateBillingPortalDto;
    UpdateBillingPortalDtoMapper: UpdateBillingPortalDto;
  },
  Entities extends {
    BillingPortalDtoMapper: BillingPortalDto;
    CreateBillingPortalDtoMapper: BillingPortalDto;
    UpdateBillingPortalDtoMapper: BillingPortalDto;
  } = {
    BillingPortalDtoMapper: BillingPortalDto;
    CreateBillingPortalDtoMapper: BillingPortalDto;
    UpdateBillingPortalDtoMapper: BillingPortalDto;
  }
> implements BillingPortalService
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
  private enableDatabaseBackup: boolean;

  constructor(
    protected em: EntityManager,
    protected cache: TtlCache,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
      BillingPortalDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['BillingPortalDtoMapper'],
        Entities['BillingPortalDtoMapper']
      >;
      CreateBillingPortalDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateBillingPortalDtoMapper'],
        Entities['CreateBillingPortalDtoMapper']
      >;
      UpdateBillingPortalDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateBillingPortalDtoMapper'],
        Entities['UpdateBillingPortalDtoMapper']
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      enableDatabaseBackup?: boolean;
    }
  ) {
    this.#mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.enableDatabaseBackup = options?.enableDatabaseBackup ?? false;
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  protected createCacheKey = createCacheKey('billing_portal_session');

  async createBillingPortalSession(
    billingPortalDto: Dto['CreateBillingPortalDtoMapper']
  ): Promise<Dto['BillingPortalDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating billing portal session',
        billingPortalDto
      );
    }

    const billingPortal =
      await this.#mappers.CreateBillingPortalDtoMapper.deserializeDtoToEntity(
        billingPortalDto,
        this.em
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush(billingPortal);
    }

    const createdBillingPortalDto =
      await this.#mappers.BillingPortalDtoMapper.serializeEntityToDto(
        billingPortal
      );

    await this.cache.putRecord({
      key: this.createCacheKey(createdBillingPortalDto.id),
      value: createdBillingPortalDto,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return createdBillingPortalDto;
  }

  async getBillingPortalSession(
    idDto: IdDto
  ): Promise<Dto['BillingPortalDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting billing portal session', idDto);
    }

    const billingPortalDetails = await this.cache.readRecord<
      Entities['BillingPortalDtoMapper']
    >(this.createCacheKey(idDto.id));

    if (!billingPortalDetails) {
      throw new Error('Session not found');
    }

    return billingPortalDetails.value;
  }

  async updateBillingPortalSession(
    billingPortalDto: UpdateBillingPortalDto
  ): Promise<Dto['BillingPortalDtoMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Updating billing portal session',
        billingPortalDto
      );
    }

    const existingBillingPortal = (
      await this.cache.readRecord<Entities['BillingPortalDtoMapper']>(
        this.createCacheKey(billingPortalDto.id)
      )
    )?.value;

    if (!existingBillingPortal) {
      throw new Error('Session not found');
    }

    const billingPortal =
      await this.#mappers.UpdateBillingPortalDtoMapper.deserializeDtoToEntity(
        billingPortalDto,
        this.em
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush({
        billingPortal
      });
    }

    const updatedBillingPortalDto = {
      ...existingBillingPortal,
      ...(await this.#mappers.BillingPortalDtoMapper.serializeEntityToDto(
        billingPortal
      ))
    };

    await this.cache.putRecord({
      key: this.createCacheKey(updatedBillingPortalDto.id),
      value: updatedBillingPortalDto,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return updatedBillingPortalDto;
  }

  async expireBillingPortalSession(idDto: IdDto): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Expiring billing portal session',
        idDto
      );
    }

    const sessionExists = await this.cache.readRecord(
      this.createCacheKey(idDto.id)
    );

    if (!sessionExists) {
      throw new Error('Session not found');
    }

    await this.cache.deleteRecord(this.createCacheKey(idDto.id));
  }
}
