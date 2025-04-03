import {
  CreateSubscriptionDto,
  SubscriptionDto,
  SubscriptionService,
  UpdateSubscriptionDto
} from '@forklaunch/interfaces-billing';
import { IdDto, InstanceTypeRecord } from '@forklaunch/common';
import {
  InternalDtoMapper,
  RequestDtoMapperConstructor,
  ResponseDtoMapperConstructor,
  transformIntoInternalDtoMapper
} from '@forklaunch/core/dtoMapper';
import {
  MetricsDefinition,
  OpenTelemetryCollector
} from '@forklaunch/core/http';
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
  #dtoMappers: InternalDtoMapper<
    InstanceTypeRecord<typeof this.dtoMappers>,
    Entities,
    Dto
  >;

  constructor(
    protected em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>,
    protected readonly schemaValidator: SchemaValidator,
    protected readonly dtoMappers: {
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
    this.#dtoMappers = transformIntoInternalDtoMapper<
      SchemaValidator,
      typeof this.dtoMappers,
      Entities,
      Dto
    >(dtoMappers, this.schemaValidator);
  }

  async createSubscription(
    subscriptionDto: Dto['CreateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription =
      this.#dtoMappers.CreateSubscriptionDtoMapper.deserializeDtoToEntity(
        subscriptionDto
      );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
    const createdSubscriptionDto =
      this.#dtoMappers.SubscriptionDtoMapper.serializeEntityToDto(subscription);
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
    return this.#dtoMappers.SubscriptionDtoMapper.serializeEntityToDto(
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

    return this.#dtoMappers.SubscriptionDtoMapper.serializeEntityToDto(
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
    return this.#dtoMappers.SubscriptionDtoMapper.serializeEntityToDto(
      subscription as Entities['SubscriptionDtoMapper']
    );
  }

  async updateSubscription(
    subscriptionDto: Dto['UpdateSubscriptionDtoMapper'],
    em?: EntityManager
  ): Promise<Dto['SubscriptionDtoMapper']> {
    const subscription =
      this.#dtoMappers.UpdateSubscriptionDtoMapper.deserializeDtoToEntity(
        subscriptionDto
      );
    const updatedSubscription = await (em ?? this.em).upsert(subscription);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(updatedSubscription);
    });
    const updatedSubscriptionDto =
      this.#dtoMappers.SubscriptionDtoMapper.serializeEntityToDto(
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

    return subscriptions.map((subscription) => {
      const subscriptionDto =
        this.#dtoMappers.SubscriptionDtoMapper.serializeEntityToDto(
          subscription as Entities['SubscriptionDtoMapper']
        );
      return subscriptionDto;
    });
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
