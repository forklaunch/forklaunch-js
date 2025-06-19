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
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import {
  StripeBillingPortalDto,
  StripeBillingPortalDtos,
  StripeCreateBillingPortalDto,
  StripeUpdateBillingPortalDto
} from '../types/stripe.dto.types';
import { StripeBillingPortalEntities } from '../types/stripe.entity.types';

export class StripeBillingPortalService<
  SchemaValidator extends AnySchemaValidator,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends StripeBillingPortalDtos = StripeBillingPortalDtos,
  Entities extends StripeBillingPortalEntities = StripeBillingPortalEntities
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
    Metrics,
    Entities,
    Entities
  >;
  protected _mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>
  >;

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
        Entities['CreateBillingPortalDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['CreateBillingPortalDtoMapper'],
          em?: EntityManager,
          session?: Stripe.BillingPortal.Session
        ) => Promise<Entities['CreateBillingPortalDtoMapper']>
      >;
      UpdateBillingPortalDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateBillingPortalDtoMapper'],
        Entities['UpdateBillingPortalDtoMapper'],
        (
          schemaValidator: SchemaValidator,
          dto: Dto['UpdateBillingPortalDtoMapper'],
          em?: EntityManager,
          session?: Stripe.BillingPortal.Session
        ) => Promise<Entities['UpdateBillingPortalDtoMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
      enableDatabaseBackup?: boolean;
    }
  ) {
    this._mappers = transformIntoInternalDtoMapper(mappers, schemaValidator);
    this.baseBillingPortalService = new BaseBillingPortalService(
      em,
      cache,
      openTelemetryCollector,
      schemaValidator,
      {
        BillingPortalDtoMapper: IdentityResponseMapper<
          Entities['BillingPortalDtoMapper'],
          SchemaValidator
        >,
        CreateBillingPortalDtoMapper: IdentityRequestMapper<
          Entities['CreateBillingPortalDtoMapper'],
          SchemaValidator
        >,
        UpdateBillingPortalDtoMapper: IdentityRequestMapper<
          Entities['UpdateBillingPortalDtoMapper'],
          SchemaValidator
        >
      },
      options
    );
  }

  async createBillingPortalSession(
    billingPortalDto: Dto['CreateBillingPortalDtoMapper']
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const session = await this.stripeClient.billingPortal.sessions.create({
      ...billingPortalDto.stripeFields,
      customer: billingPortalDto.customerId
    });

    const billingPortalEntity =
      await this.baseBillingPortalService.createBillingPortalSession(
        await this._mappers.CreateBillingPortalDtoMapper.deserializeDtoToEntity(
          this.schemaValidator,
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

    return this._mappers.BillingPortalDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      billingPortalEntity
    );
  }

  async getBillingPortalSession(
    idDto: IdDto
  ): Promise<Dto['BillingPortalDtoMapper']> {
    const billingPortalEntity =
      await this.baseBillingPortalService.getBillingPortalSession(idDto);

    return this._mappers.BillingPortalDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      billingPortalEntity
    );
  }

  async expireBillingPortalSession(idDto: IdDto): Promise<void> {
    return this.baseBillingPortalService.expireBillingPortalSession(idDto);
  }

  async updateBillingPortalSession(
    billingPortalDto: Dto['UpdateBillingPortalDtoMapper']
  ): Promise<Dto['BillingPortalDtoMapper']> {
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
        await this._mappers.UpdateBillingPortalDtoMapper.deserializeDtoToEntity(
          this.schemaValidator,
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

    return this._mappers.BillingPortalDtoMapper.serializeEntityToDto(
      this.schemaValidator,
      baseBillingPortalDto
    );
  }
}
