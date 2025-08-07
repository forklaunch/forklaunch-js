import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import { TtlCache } from '@forklaunch/core/cache';
import {
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { BaseBillingPortalService } from '@forklaunch/implementation-billing-base/services';
import { BillingPortalService } from '@forklaunch/interfaces-billing/interfaces';
import {
  IdentityRequestMapper,
  IdentityResponseMapper,
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import {
  StripeBillingPortalDto,
  StripeBillingPortalDtos,
  StripeCreateBillingPortalDto,
  StripeUpdateBillingPortalDto
} from '../domain/types/stripe.dto.types';
import { StripeBillingPortalEntities } from '../domain/types/stripe.entity.types';

export class StripeBillingPortalService<
  SchemaValidator extends AnySchemaValidator,
  Entities extends StripeBillingPortalEntities,
  Dto extends StripeBillingPortalDtos = StripeBillingPortalDtos
> implements
    BillingPortalService<{
      CreateBillingPortalDto: StripeCreateBillingPortalDto;
      UpdateBillingPortalDto: StripeUpdateBillingPortalDto;
      BillingPortalDto: StripeBillingPortalDto;
      IdDto: IdDto;
    }>
{
  private readonly billingPortalSessionExpiryDurationMs = 5 * 60 * 1000;

  baseBillingPortalService: BaseBillingPortalService<
    SchemaValidator,
    Entities,
    Entities
  >;
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  protected stripeClient: Stripe;
  protected em: EntityManager;
  protected cache: TtlCache;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
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
        em: EntityManager,
        session: Stripe.BillingPortal.Session
      ) => Promise<Entities['CreateBillingPortalMapper']>
    >;
    UpdateBillingPortalMapper: RequestMapperConstructor<
      SchemaValidator,
      Dto['UpdateBillingPortalMapper'],
      Entities['UpdateBillingPortalMapper'],
      (
        dto: Dto['UpdateBillingPortalMapper'],
        em: EntityManager,
        session: Stripe.BillingPortal.Session
      ) => Promise<Entities['UpdateBillingPortalMapper']>
    >;
  };

  constructor(
    stripeClient: Stripe,
    em: EntityManager,
    cache: TtlCache,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: {
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
          em: EntityManager,
          session: Stripe.BillingPortal.Session
        ) => Promise<Entities['CreateBillingPortalMapper']>
      >;
      UpdateBillingPortalMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdateBillingPortalMapper'],
        Entities['UpdateBillingPortalMapper'],
        (
          dto: Dto['UpdateBillingPortalMapper'],
          em: EntityManager,
          session: Stripe.BillingPortal.Session
        ) => Promise<Entities['UpdateBillingPortalMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      enableDatabaseBackup?: boolean;
    }
  ) {
    this.stripeClient = stripeClient;
    this.em = em;
    this.cache = cache;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this._mappers = transformIntoInternalMapper(mappers, schemaValidator);
    this.baseBillingPortalService = new BaseBillingPortalService(
      em,
      cache,
      openTelemetryCollector,
      schemaValidator,
      {
        BillingPortalMapper: IdentityResponseMapper<
          Entities['BillingPortalMapper']
        >,
        CreateBillingPortalMapper: IdentityRequestMapper<
          Entities['CreateBillingPortalMapper']
        >,
        UpdateBillingPortalMapper: IdentityRequestMapper<
          Entities['UpdateBillingPortalMapper']
        >
      },
      options
    );
  }

  async createBillingPortalSession(
    billingPortalDto: Dto['CreateBillingPortalMapper']
  ): Promise<Dto['BillingPortalMapper']> {
    const session = await this.stripeClient.billingPortal.sessions.create({
      ...billingPortalDto.stripeFields,
      customer: billingPortalDto.customerId
    });

    const billingPortalEntity =
      await this.baseBillingPortalService.createBillingPortalSession(
        await this._mappers.CreateBillingPortalMapper.deserializeDtoToEntity(
          {
            ...billingPortalDto,
            id: session.id,
            uri: session.url,
            expiresAt: new Date(
              Date.now() + this.billingPortalSessionExpiryDurationMs
            )
          },
          this.em,
          session
        )
      );

    return this._mappers.BillingPortalMapper.serializeEntityToDto(
      billingPortalEntity
    );
  }

  async getBillingPortalSession(
    idDto: IdDto
  ): Promise<Dto['BillingPortalMapper']> {
    const billingPortalEntity =
      await this.baseBillingPortalService.getBillingPortalSession(idDto);

    return this._mappers.BillingPortalMapper.serializeEntityToDto(
      billingPortalEntity
    );
  }

  async expireBillingPortalSession(idDto: IdDto): Promise<void> {
    return this.baseBillingPortalService.expireBillingPortalSession(idDto);
  }

  async updateBillingPortalSession(
    billingPortalDto: Dto['UpdateBillingPortalMapper']
  ): Promise<Dto['BillingPortalMapper']> {
    const existingSession =
      await this.baseBillingPortalService.getBillingPortalSession({
        id: billingPortalDto.id
      });
    const session = await this.stripeClient.billingPortal.sessions.create({
      ...billingPortalDto.stripeFields,
      customer: existingSession.customerId
    });

    const baseBillingPortalDto =
      await this.baseBillingPortalService.updateBillingPortalSession(
        await this._mappers.UpdateBillingPortalMapper.deserializeDtoToEntity(
          {
            ...billingPortalDto,
            id: session.id,
            uri: session.url,
            expiresAt: new Date(
              Date.now() + this.billingPortalSessionExpiryDurationMs
            )
          },
          this.em,
          session
        )
      );

    return this._mappers.BillingPortalMapper.serializeEntityToDto(
      baseBillingPortalDto
    );
  }
}
