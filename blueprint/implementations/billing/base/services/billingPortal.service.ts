import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import { BillingPortalService } from '@forklaunch/interfaces-billing/interfaces';
import {
  BillingPortalDto,
  CreateBillingPortalDto,
  UpdateBillingPortalDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';

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
  #mapperss: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mapperss>,
    Entities,
    Dto
  >;

  constructor(
    protected cache: TtlCache,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected schemaValidator: SchemaValidator,
    protected mapperss: {
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
    }
  ) {
    this.#mapperss = transformIntoInternalDtoMapper(mapperss, schemaValidator);
  }

  protected createCacheKey = createCacheKey('billing_portal_session');

  async createBillingPortalSession(
    billingPortalDto: Dto['CreateBillingPortalDtoMapper']
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const billingPortalSession =
      this.#mapperss.CreateBillingPortalDtoMapper.deserializeDtoToEntity(
        billingPortalDto
      );

    this.openTelemetryCollector.debug(
      'Create billing portal session',
      billingPortalSession
    );

    await this.cache.putRecord({
      key: this.createCacheKey(billingPortalSession.id),
      value: billingPortalSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#mapperss.BillingPortalDtoMapper.serializeEntityToDto(
      billingPortalSession
    );
  }

  async getBillingPortalSession(
    idDto: IdDto
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const billingPortalSessionDetails = await this.cache.readRecord<
      Entities['BillingPortalDtoMapper']
    >(this.createCacheKey(idDto.id));
    if (!billingPortalSessionDetails) {
      throw new Error('Session not found');
    }

    return this.#mapperss.BillingPortalDtoMapper.serializeEntityToDto(
      billingPortalSessionDetails.value
    );
  }

  async updateBillingPortalSession(
    billingPortalDto: UpdateBillingPortalDto
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const billingPortalSession =
      this.#mapperss.UpdateBillingPortalDtoMapper.deserializeDtoToEntity(
        billingPortalDto
      );
    // Save the updated session to your database or external service
    await this.cache.putRecord({
      key: this.createCacheKey(billingPortalSession.id),
      value: billingPortalSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#mapperss.BillingPortalDtoMapper.serializeEntityToDto(
      billingPortalSession
    );
  }

  async expireBillingPortalSession(idDto: IdDto): Promise<void> {
    const sessionExists = await this.cache.readRecord(
      this.createCacheKey(idDto.id)
    );
    if (!sessionExists) {
      throw new Error('Session not found');
    }

    await this.cache.deleteRecord(this.createCacheKey(idDto.id));
  }
}
