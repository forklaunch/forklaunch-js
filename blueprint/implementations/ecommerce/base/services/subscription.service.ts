import { IdsDto } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { SubscriptionService } from '@forklaunch/interfaces-ecommerce/interfaces';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto
} from '@forklaunch/interfaces-ecommerce/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager, InferEntity } from '@mikro-orm/core';
import { BaseSubscriptionDtos } from '../domain/types/baseEcommerceDto.types';
import { BaseSubscriptionEntities } from '../domain/types/baseEcommerceEntity.types';
import { SubscriptionMappers } from '../domain/types/subscription.mapper.types';
import { Subscription } from '../persistence/entities';

/**
 * Subscribe-and-save (ECOM-25). Recurring reorders attached to a customer;
 * the worker turns each due cycle into a normal order (so inventory,
 * fulfillment, and accounting all flow through the standard order path).
 * Pause/resume/cancel are status changes via updateSubscription.
 */
export class BaseSubscriptionService<
  SchemaValidator extends AnySchemaValidator,
  MapperEntities extends BaseSubscriptionEntities,
  MapperDomains extends BaseSubscriptionDtos = BaseSubscriptionDtos
> implements SubscriptionService
{
  private evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };
  public em: EntityManager;
  protected openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>;
  protected schemaValidator: SchemaValidator;
  protected mappers: SubscriptionMappers<MapperEntities, MapperDomains>;

  constructor(
    em: EntityManager,
    openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    schemaValidator: SchemaValidator,
    mappers: SubscriptionMappers<MapperEntities, MapperDomains>,
    options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this.em = em;
    this.openTelemetryCollector = openTelemetryCollector;
    this.schemaValidator = schemaValidator;
    this.mappers = mappers;
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async listSubscriptions(
    idsDto?: IdsDto,
    em?: EntityManager
  ): Promise<MapperDomains['SubscriptionMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing subscriptions', idsDto);
    }
    return Promise.all(
      (
        await (em ?? this.em).findAll(
          this.mappers.SubscriptionMapper.entity as typeof Subscription,
          {
            where: idsDto?.ids?.length ? { id: { $in: idsDto.ids } } : undefined
          }
        )
      ).map((subscription) =>
        this.mappers.SubscriptionMapper.toDto(
          subscription as InferEntity<MapperEntities['SubscriptionMapper']>
        )
      )
    );
  }

  async createSubscription(
    subscriptionDto: CreateSubscriptionDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Creating subscription', subscriptionDto);
    }
    const subscription = await this.mappers.CreateSubscriptionMapper.toEntity(
      subscriptionDto,
      em ?? this.em,
      ...(args[0] instanceof EntityManager ? args.slice(1) : args)
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
    return this.mappers.SubscriptionMapper.toDto(subscription);
  }

  async getSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<MapperDomains['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting subscription', idDto);
    }
    const subscription = await (em ?? this.em).findOneOrFail(
      this.mappers.SubscriptionMapper.entity as typeof Subscription,
      idDto
    );
    return this.mappers.SubscriptionMapper.toDto(
      subscription as InferEntity<MapperEntities['SubscriptionMapper']>
    );
  }

  async updateSubscription(
    subscriptionDto: UpdateSubscriptionDto,
    em?: EntityManager,
    ...args: unknown[]
  ): Promise<MapperDomains['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Updating subscription', subscriptionDto);
    }
    const subscription = await this.mappers.UpdateSubscriptionMapper.toEntity(
      subscriptionDto,
      em ?? this.em,
      ...args
    );
    const updated = await (em ?? this.em).upsert(subscription);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
    return this.mappers.SubscriptionMapper.toDto(updated);
  }

  async deleteSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting subscription', idDto);
    }
    await (em ?? this.em).nativeDelete(
      this.mappers.SubscriptionMapper.entity as typeof Subscription,
      idDto
    );
  }
}
