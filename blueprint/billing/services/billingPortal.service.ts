import {
  BaseDtoParameters,
  IdDto,
  SchemaValidator
} from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { createCacheKey, TtlCache } from '@forklaunch/core/cache';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import {
  BaseBillingPortalServiceParameters,
  BillingPortalService
} from '../interfaces/billingPortal.service.interface';
import {
  BillingPortalDto,
  CreateBillingPortalDto,
  CreateBillingPortalDtoMapper,
  UpdateBillingPortalDto,
  UpdateBillingPortalDtoMapper
} from '../models/dtoMapper/billingPortal.dtoMapper';
import { BillingPortal } from '../models/persistence/billingPortal.dtoMapper';

export class BaseBillingPortalService
  implements
    BillingPortalService<
      BaseDtoParameters<typeof BaseBillingPortalServiceParameters>
    >
{
  SchemaDefinition = BaseBillingPortalServiceParameters;

  constructor(
    private cache: TtlCache,
    private openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  protected createCacheKey = createCacheKey('billing_portal_session');

  async createBillingPortalSession(
    billingPortalDto: CreateBillingPortalDto
  ): Promise<BillingPortalDto> {
    const billingPortalSession =
      CreateBillingPortalDtoMapper.deserializeDtoToEntity(
        SchemaValidator(),
        billingPortalDto
      );
    // Save the session to your database or external service
    await this.cache.putRecord({
      key: this.createCacheKey(billingPortalSession.id),
      value: billingPortalSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return billingPortalSession;
  }

  async getBillingPortalSession(idDto: IdDto): Promise<BillingPortalDto> {
    const billingPortalSessionDetails =
      await this.cache.readRecord<BillingPortal>(this.createCacheKey(idDto.id));
    if (!billingPortalSessionDetails) {
      throw new Error('Session not found');
    }

    return billingPortalSessionDetails.value;
  }

  async updateBillingPortalSession(
    billingPortalDto: UpdateBillingPortalDto
  ): Promise<BillingPortalDto> {
    const billingPortalSession =
      UpdateBillingPortalDtoMapper.deserializeDtoToEntity(
        SchemaValidator(),
        billingPortalDto
      );
    // Save the updated session to your database or external service
    await this.cache.putRecord({
      key: this.createCacheKey(billingPortalSession.id),
      value: billingPortalSession,
      ttlMilliseconds: this.cache.getTtlMilliseconds()
    });

    return billingPortalSession;
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
