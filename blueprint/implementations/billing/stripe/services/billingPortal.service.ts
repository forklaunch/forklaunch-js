import { IdDto } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import {
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor
} from '@forklaunch/core/mappers';
import { BaseBillingPortalService } from '@forklaunch/implementation-billing-base/services';
import { BillingPortalService } from '@forklaunch/interfaces-billing/interfaces';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import {
  StripeBillingPortalDto,
  StripeCreateBillingPortalDto,
  StripeUpdateBillingPortalDto
} from '../types/stripe.types';

export class StripeBillingPortalService<
    SchemaValidator extends AnySchemaValidator,
    Metrics extends MetricsDefinition = MetricsDefinition,
    Dto extends {
      BillingPortalDtoMapper: StripeBillingPortalDto;
      CreateBillingPortalDtoMapper: StripeCreateBillingPortalDto;
      UpdateBillingPortalDtoMapper: StripeUpdateBillingPortalDto;
    } = {
      BillingPortalDtoMapper: StripeBillingPortalDto;
      CreateBillingPortalDtoMapper: StripeCreateBillingPortalDto;
      UpdateBillingPortalDtoMapper: StripeUpdateBillingPortalDto;
    },
    Entities extends {
      BillingPortalDtoMapper: StripeBillingPortalDto;
      CreateBillingPortalDtoMapper: StripeBillingPortalDto;
      UpdateBillingPortalDtoMapper: StripeBillingPortalDto;
    } = {
      BillingPortalDtoMapper: StripeBillingPortalDto;
      CreateBillingPortalDtoMapper: StripeBillingPortalDto;
      UpdateBillingPortalDtoMapper: StripeBillingPortalDto;
    }
  >
  extends BaseBillingPortalService<SchemaValidator, Metrics, Dto, Entities>
  implements
    BillingPortalService<{
      CreateBillingPortalDto: StripeCreateBillingPortalDto;
      UpdateBillingPortalDto: StripeUpdateBillingPortalDto;
      BillingPortalDto: StripeBillingPortalDto;
      IdDto: IdDto;
    }>
{
  constructor(
    protected stripeClient: Stripe,
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
    super(em, cache, openTelemetryCollector, schemaValidator, mappers, options);
  }

  async createBillingPortalSession(
    billingPortalDto: Dto['CreateBillingPortalDtoMapper']
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const session = await this.stripeClient.billingPortal.sessions.create({
      ...billingPortalDto.extraFields,
      customer: billingPortalDto.customerId
    });
    return super.createBillingPortalSession({
      ...billingPortalDto,
      id: session.id,
      uri: session.url,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      extraFields: session
    });
  }

  async updateBillingPortalSession(
    billingPortalDto: Dto['UpdateBillingPortalDtoMapper']
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const existingSession = await this.getBillingPortalSession({
      id: billingPortalDto.id
    });
    const session = await this.stripeClient.billingPortal.sessions.create({
      ...billingPortalDto.extraFields,
      customer: existingSession.customerId
    });
    return super.updateBillingPortalSession({
      ...billingPortalDto,
      id: session.id,
      uri: session.url,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      extraFields: session
    });
  }
}
