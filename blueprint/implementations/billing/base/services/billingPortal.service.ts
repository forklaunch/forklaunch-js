import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BillingPortalService } from '@forklaunch/interfaces-billing/interfaces';
import { UpdateBillingPortalDto } from '@forklaunch/interfaces-billing/types';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { BaseBillingDtos } from '../types/baseBillingDto.types';
import { BaseBillingEntities } from '../types/baseBillingEntity.types';

export class BaseBillingPortalService<
  SchemaValidator extends AnySchemaValidator,
  Entities extends BaseBillingEntities,
  Dto extends BaseBillingDtos = BaseBillingDtos
> implements BillingPortalService
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  protected evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  protected enableDatabaseBackup: boolean;

  constructor(
    protected em: EntityManager,
    protected cache: TtlCache,
    protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected schemaValidator: SchemaValidator,
    protected mappers: {
      BillingPortalMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['BillingPortalMapper'],
        Entities['BillingPortalMapper']
      >;
      CreateBillingPortalMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreateBillingPortalMapper'],
        Entities['CreateBillingPortalMapper'],
        (
          dto: Dto['CreateBillingPortalMapper'],
          em: EntityManager
        ) => Promise<Entities['CreateBillingPortalMapper']>
      >;
      UpdateBillingPortalMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdateBillingPortalMapper'],
        Entities['UpdateBillingPortalMapper'],
        (
          dto: Dto['UpdateBillingPortalMapper'],
          em: EntityManager
        ) => Promise<Entities['UpdateBillingPortalMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      enableDatabaseBackup?: boolean;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
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
    billingPortalDto: Dto['CreateBillingPortalMapper']
  ): Promise<Dto['BillingPortalMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating billing portal session',
        billingPortalDto
      );
    }

    const billingPortal =
      await this._mappers.CreateBillingPortalMapper.deserializeDtoToEntity(
        billingPortalDto,
        this.em
      );

    if (this.enableDatabaseBackup) {
      await this.em.persistAndFlush(billingPortal);
    }

    const createdBillingPortalDto =
      await this._mappers.BillingPortalMapper.serializeEntityToDto(
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
  ): Promise<Dto['BillingPortalMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting billing portal session', idDto);
    }

    const billingPortalDetails = await this.cache.readRecord<
      Entities['BillingPortalMapper']
    >(this.createCacheKey(idDto.id));

    if (!billingPortalDetails) {
      throw new Error('Session not found');
    }

    return billingPortalDetails.value;
  }

  async updateBillingPortalSession(
    billingPortalDto: UpdateBillingPortalDto
  ): Promise<Dto['BillingPortalMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Updating billing portal session',
        billingPortalDto
      );
    }

    const existingBillingPortal = (
      await this.cache.readRecord<Entities['BillingPortalMapper']>(
        this.createCacheKey(billingPortalDto.id)
      )
    )?.value;

    if (!existingBillingPortal) {
      throw new Error('Session not found');
    }

    const billingPortal =
      await this._mappers.UpdateBillingPortalMapper.deserializeDtoToEntity(
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
      ...(await this._mappers.BillingPortalMapper.serializeEntityToDto(
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
