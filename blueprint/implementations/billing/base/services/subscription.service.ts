import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  evaluateTelemetryOptions,
  MetricsDefinition,
  OpenTelemetryCollector,
  TelemetryOptions
} from '@forklaunch/core/http';
import { SubscriptionService } from '@forklaunch/interfaces-billing/interfaces';
import {
  InternalMapper,
  RequestMapperConstructor,
  ResponseMapperConstructor,
  transformIntoInternalMapper
} from '@forklaunch/internal';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';
import { BaseSubscriptionDtos } from '../domain/types/baseBillingDto.types';
import { BaseSubscriptionEntities } from '../domain/types/baseBillingEntity.types';

export class BaseSubscriptionService<
  SchemaValidator extends AnySchemaValidator,
  PartyType,
  BillingProviderType,
  Entities extends BaseSubscriptionEntities<PartyType, BillingProviderType>,
  Dto extends BaseSubscriptionDtos<
    PartyType,
    BillingProviderType
  > = BaseSubscriptionDtos<PartyType, BillingProviderType>
> implements SubscriptionService<PartyType, BillingProviderType>
{
  protected _mappers: InternalMapper<InstanceTypeRecord<typeof this.mappers>>;
  protected evaluatedTelemetryOptions: {
    logging?: boolean;
    metrics?: boolean;
    tracing?: boolean;
  };

  constructor(
    protected em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<MetricsDefinition>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      SubscriptionMapper: ResponseMapperConstructor<
        SchemaValidator,
        Dto['SubscriptionMapper'],
        Entities['SubscriptionMapper']
      >;
      CreateSubscriptionMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['CreateSubscriptionMapper'],
        Entities['CreateSubscriptionMapper'],
        (
          dto: Dto['CreateSubscriptionMapper'],
          em: EntityManager
        ) => Promise<Entities['CreateSubscriptionMapper']>
      >;
      UpdateSubscriptionMapper: RequestMapperConstructor<
        SchemaValidator,
        Dto['UpdateSubscriptionMapper'],
        Entities['UpdateSubscriptionMapper'],
        (
          dto: Dto['UpdateSubscriptionMapper'],
          em: EntityManager
        ) => Promise<Entities['UpdateSubscriptionMapper']>
      >;
    },
    readonly options?: {
      telemetry?: TelemetryOptions;
    }
  ) {
    this._mappers = transformIntoInternalMapper(mappers, this.schemaValidator);
    this.evaluatedTelemetryOptions = options?.telemetry
      ? evaluateTelemetryOptions(options.telemetry).enabled
      : {
          logging: false,
          metrics: false,
          tracing: false
        };
  }

  async createSubscription(
    subscriptionDto: Dto['CreateSubscriptionMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Creating subscription',
        subscriptionDto
      );
    }
    const subscription =
      await this._mappers.CreateSubscriptionMapper.deserializeDtoToEntity(
        subscriptionDto,
        em ?? this.em
      );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
    const createdSubscriptionDto =
      await this._mappers.SubscriptionMapper.serializeEntityToDto(subscription);
    return createdSubscriptionDto;
  }

  async getSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting subscription', idDto);
    }
    const subscription = await (em ?? this.em).findOneOrFail(
      'Subscription',
      idDto
    );
    return this._mappers.SubscriptionMapper.serializeEntityToDto(
      subscription as Entities['SubscriptionMapper']
    );
  }

  async getUserSubscription(
    { id }: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting user subscription', id);
    }
    const subscription = await (em ?? this.em).findOneOrFail('Subscription', {
      partyId: id,
      partyType: 'USER',
      active: true
    });

    return this._mappers.SubscriptionMapper.serializeEntityToDto(
      subscription as Entities['SubscriptionMapper']
    );
  }

  async getOrganizationSubscription(
    { id }: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Getting organization subscription', id);
    }
    const subscription = await (em ?? this.em).findOneOrFail('Subscription', {
      partyId: id,
      partyType: 'ORGANIZATION',
      active: true
    });
    return this._mappers.SubscriptionMapper.serializeEntityToDto(
      subscription as Entities['SubscriptionMapper']
    );
  }

  async updateSubscription(
    subscriptionDto: Dto['UpdateSubscriptionMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper']> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info(
        'Updating subscription',
        subscriptionDto
      );
    }
    const subscription =
      this._mappers.UpdateSubscriptionMapper.deserializeDtoToEntity(
        subscriptionDto,
        em ?? this.em
      );
    const updatedSubscription = await (em ?? this.em).upsert(subscription);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(updatedSubscription);
    });
    const updatedSubscriptionDto =
      await this._mappers.SubscriptionMapper.serializeEntityToDto(
        updatedSubscription
      );

    return updatedSubscriptionDto;
  }

  async deleteSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Deleting subscription', idDto);
    }
    const subscription = await (em ?? this.em).findOne('Subscription', idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    await (em ?? this.em).removeAndFlush(subscription);
  }

  async listSubscriptions(
    idsDto: { ids?: string[] },
    em?: EntityManager
  ): Promise<Dto['SubscriptionMapper'][]> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Listing subscriptions', idsDto);
    }
    const subscriptions = await (em ?? this.em).findAll('Subscription', {
      where: idsDto.ids
        ? {
            id: {
              $in: idsDto.ids
            }
          }
        : undefined
    });

    return Promise.all(
      subscriptions.map((subscription) => {
        const subscriptionDto =
          this._mappers.SubscriptionMapper.serializeEntityToDto(
            subscription as Entities['SubscriptionMapper']
          );
        return subscriptionDto;
      })
    );
  }

  async cancelSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Canceling subscription', idDto);
    }
    const subscription = await (em ?? this.em).findOne('Subscription', idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    (subscription as Entities['SubscriptionMapper']).active = false;
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
  }

  async resumeSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    if (this.evaluatedTelemetryOptions.logging) {
      this.openTelemetryCollector.info('Resuming subscription', idDto);
    }
    const subscription = await (em ?? this.em).findOne('Subscription', idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    (subscription as Entities['SubscriptionMapper']).active = true;
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
  }
}
