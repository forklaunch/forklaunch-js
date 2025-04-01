import {
  BillingPortalDto,
  BillingPortalService,
  BillingPortalServiceParameters,
  CreateBillingPortalDto,
  UpdateBillingPortalDto
} from '@forklaunch/blueprint-billing-interfaces';
import { IdDto, ReturnTypeRecord } from '@forklaunch/common';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import {
  InternalDtoMapper,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';

export class BaseBillingPortalService<
  Metrics extends MetricsDefinition,
  Dto extends {
    BillingPortalDtoMapper: BillingPortalDto;
    CreateBillingPortalDtoMapper: CreateBillingPortalDto;
    UpdateBillingPortalDtoMapper: UpdateBillingPortalDto;
  },
  Entities extends {
    BillingPortalDtoMapper: BillingPortalDto;
    CreateBillingPortalDtoMapper: BillingPortalDto;
    UpdateBillingPortalDtoMapper: BillingPortalDto;
  }
> implements BillingPortalService
{
  SchemaDefinition!: BillingPortalServiceParameters;
  #dtoMappers: InternalDtoMapper<
    ReturnTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    protected cache: TtlCache,
    protected openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected dtoMappers: {
      BillingPortalDtoMapper: () => {
        dto: Dto['BillingPortalDtoMapper'];
        _Entity: Entities['BillingPortalDtoMapper'];
        serializeEntityToDto: unknown;
      };
      CreateBillingPortalDtoMapper: () => {
        dto: Dto['CreateBillingPortalDtoMapper'];
        _Entity: Entities['CreateBillingPortalDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
      UpdateBillingPortalDtoMapper: () => {
        dto: Dto['UpdateBillingPortalDtoMapper'];
        _Entity: Entities['UpdateBillingPortalDtoMapper'];
        deserializeDtoToEntity: unknown;
      };
    }
  ) {
    this.#dtoMappers = transformIntoInternalDtoMapper(dtoMappers);
  }

  protected createCacheKey = createCacheKey('billing_portal_session');

  async createBillingPortalSession(
    billingPortalDto: Dto['CreateBillingPortalDtoMapper']
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const billingPortalSession =
      this.#dtoMappers.CreateBillingPortalDtoMapper.deserializeDtoToEntity(
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

    return this.#dtoMappers.BillingPortalDtoMapper.serializeEntityToDto(
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

    return this.#dtoMappers.BillingPortalDtoMapper.serializeEntityToDto(
      billingPortalSessionDetails.value
    );
  }

  async updateBillingPortalSession(
    billingPortalDto: UpdateBillingPortalDto
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const billingPortalSession =
      this.#dtoMappers.UpdateBillingPortalDtoMapper.deserializeDtoToEntity(
        billingPortalDto
      );
    // Save the updated session to your database or external service
    await this.cache.putRecord({
      key: this.createCacheKey(billingPortalSession.id),
      value: billingPortalSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return this.#dtoMappers.BillingPortalDtoMapper.serializeEntityToDto(
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
