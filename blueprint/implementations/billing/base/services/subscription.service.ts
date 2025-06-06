import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/mappers';
import { SubscriptionService } from '@forklaunch/interfaces-billing/interfaces';
import {
  CreateSubscriptionDto,
  SubscriptionDto,
  UpdateSubscriptionDto
} from '@forklaunch/interfaces-billing/types';
import { AnySchemaValidator } from '@forklaunch/validator';
import { EntityManager } from '@mikro-orm/core';

export class BaseSubscriptionService<
  SchemaValidator extends AnySchemaValidator,
  PartyType,
  BillingProviderType,
  Metrics extends MetricsDefinition = MetricsDefinition,
  Dto extends {
    SubscriptionDtoMapper: SubscriptionDto<PartyType, BillingProviderType>;
    CreateSubscriptionDtoMapper: CreateSubscriptionDto<
      PartyType,
      BillingProviderType
    >;
    UpdateSubscriptionDtoMapper: UpdateSubscriptionDto<
      PartyType,
      BillingProviderType
    >;
  } = {
    SubscriptionDtoMapper: SubscriptionDto<PartyType, BillingProviderType>;
    CreateSubscriptionDtoMapper: CreateSubscriptionDto<
      PartyType,
      BillingProviderType
    >;
    UpdateSubscriptionDtoMapper: UpdateSubscriptionDto<
      PartyType,
      BillingProviderType
    >;
  },
  Entities extends {
    SubscriptionDtoMapper: SubscriptionDto<PartyType, BillingProviderType>;
    CreateSubscriptionDtoMapper: SubscriptionDto<
      PartyType,
      BillingProviderType
    >;
    UpdateSubscriptionDtoMapper: SubscriptionDto<
      PartyType,
      BillingProviderType
    >;
  } = {
    SubscriptionDtoMapper: SubscriptionDto<PartyType, BillingProviderType>;
    CreateSubscriptionDtoMapper: SubscriptionDto<
      PartyType,
      BillingProviderType
    >;
    UpdateSubscriptionDtoMapper: SubscriptionDto<
      PartyType,
      BillingProviderType
    >;
  }
> implements SubscriptionService<PartyType, BillingProviderType>
{
  #mappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.mappers>,
    Entities,
    Dto
  >;

  constructor(
    protected em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly mappers: {
      SubscriptionDtoMapper: ResponseDtoMapperConstructor<
        SchemaValidator,
        Dto['SubscriptionDtoMapper'],
        Entities['SubscriptionDtoMapper']
      >;
      CreateSubscriptionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['CreateSubscriptionDtoMapper'],
        Entities['CreateSubscriptionDtoMapper']
      >;
      UpdateSubscriptionDtoMapper: RequestDtoMapperConstructor<
        SchemaValidator,
        Dto['UpdateSubscriptionDtoMapper'],
        Entities['UpdateSubscriptionDtoMapper']
      >;
    }
  ) {
    this.#mappers = transformIntoInternalDtoMapper<
      SchemaValidator,
      typeof this.mappers,
      Entities,
      Dto
    >(mappers, this.schemaValidator);
  }

  async createSubscription(
    subscriptionDto: Dto['CreateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription =
      await this.#mappers.CreateSubscriptionDtoMapper.deserializeDtoToEntity(
        subscriptionDto
      );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
    const createdSubscriptionDto =
      await this.#mappers.SubscriptionDtoMapper.serializeEntityToDto(
        subscription
      );
    return createdSubscriptionDto;
  }

  async getSubscription(
    idDto: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription = await (em ?? this.em).findOneOrFail(
      'Subscription',
      idDto
    );
    return this.#mappers.SubscriptionDtoMapper.serializeEntityToDto(
      subscription as Entities['SubscriptionDtoMapper']
    );
  }

  async getUserSubscription(
    { id }: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription = await (em ?? this.em).findOneOrFail('Subscription', {
      partyId: id,
      partyType: 'USER',
      active: true
    });

    return this.#mappers.SubscriptionDtoMapper.serializeEntityToDto(
      subscription as Entities['SubscriptionDtoMapper']
    );
  }

  async getOrganizationSubscription(
    { id }: IdDto,
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription = await (em ?? this.em).findOneOrFail('Subscription', {
      partyId: id,
      partyType: 'ORGANIZATION',
      active: true
    });
    return this.#mappers.SubscriptionDtoMapper.serializeEntityToDto(
      subscription as Entities['SubscriptionDtoMapper']
    );
  }

  async updateSubscription(
    subscriptionDto: Dto['UpdateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription =
      this.#mappers.UpdateSubscriptionDtoMapper.deserializeDtoToEntity(
        subscriptionDto
      );
    const updatedSubscription = await (em ?? this.em).upsert(subscription);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(updatedSubscription);
    });
    const updatedSubscriptionDto =
      await this.#mappers.SubscriptionDtoMapper.serializeEntityToDto(
        updatedSubscription
      );

    return updatedSubscriptionDto;
  }

  async deleteSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    const subscription = await (em ?? this.em).findOne('Subscription', idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    await (em ?? this.em).removeAndFlush(subscription);
  }

  async listSubscriptions(
    idsDto: { ids?: string[] },
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper'][]> {
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
          this.#mappers.SubscriptionDtoMapper.serializeEntityToDto(
            subscription as Entities['SubscriptionDtoMapper']
          );
        return subscriptionDto;
      })
    );
  }

  async cancelSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    const subscription = await (em ?? this.em).findOne('Subscription', idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    (subscription as Entities['SubscriptionDtoMapper']).active = false;
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
  }

  async resumeSubscription(idDto: IdDto, em?: EntityManager): Promise<void> {
    const subscription = await (em ?? this.em).findOne('Subscription', idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    (subscription as Entities['SubscriptionDtoMapper']).active = true;
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
  }
}
