import { BaseDtoParameters, SchemaValidator } from '@forklaunch/blueprint-core';
import { Metrics } from '@forklaunch/blueprint-monitoring';
import { Id } from '@forklaunch/common';
import { OpenTelemetryCollector } from '@forklaunch/core/http';
import { EntityManager } from '@mikro-orm/core';
import {
  BaseSubscriptionServiceParameters,
  SubscriptionService
} from '../interfaces/subscription.service.interface';
import {
  CreateSubscriptionDto,
  CreateSubscriptionDtoMapper,
  SubscriptionDto,
  SubscriptionDtoMapper,
  UpdateSubscriptionDto,
  UpdateSubscriptionDtoMapper
} from '../models/dtoMapper/subscription.dtoMapper';
import { PartyEnum } from '../models/enum/party.enum';
import { Subscription } from '../models/persistence/subscription.entity';

export class BaseSubscriptionService
  implements
    SubscriptionService<
      BaseDtoParameters<typeof BaseSubscriptionServiceParameters>
    >
{
  constructor(
    protected em: EntityManager,
    protected readonly openTelemetryCollector: OpenTelemetryCollector<Metrics>
  ) {}

  async createSubscription(
    subscriptionDto: CreateSubscriptionDto,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = CreateSubscriptionDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      subscriptionDto
    );
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
    const createdSubscriptionDto = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      subscription
    );
    return createdSubscriptionDto;
  }

  async getSubscription(
    { id }: Id,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Subscription, { id })
    );

    return subscription;
  }

  async getUserSubscription(
    { id }: Id,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Subscription, {
        partyId: id,
        partyType: PartyEnum.USER,
        active: true
      })
    );

    return subscription;
  }

  async getOrganizationSubscription(
    { id }: Id,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Subscription, {
        partyId: id,
        partyType: PartyEnum.ORGANIZATION,
        active: true
      })
    );

    return subscription;
  }

  async updateSubscription(
    subscriptionDto: UpdateSubscriptionDto,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = UpdateSubscriptionDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      subscriptionDto
    );
    const updatedSubscription = await (em ?? this.em).upsert(subscription);
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(updatedSubscription);
    });
    const updatedSubscriptionDto = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      updatedSubscription
    );

    return updatedSubscriptionDto;
  }

  async deleteSubscription(
    idDto: { id: string },
    em?: EntityManager
  ): Promise<void> {
    const subscription = await (em ?? this.em).findOne(Subscription, idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    await (em ?? this.em).removeAndFlush(subscription);
  }

  async listSubscriptions(
    idsDto: { ids?: string[] },
    em?: EntityManager
  ): Promise<SubscriptionDto[]> {
    const subscriptions = await (em ?? this.em).findAll(Subscription, {
      where: idsDto.ids
        ? {
            id: {
              $in: idsDto.ids
            }
          }
        : undefined
    });

    return subscriptions.map((subscription) => {
      const subscriptionDto = SubscriptionDtoMapper.serializeEntityToDto(
        SchemaValidator(),
        subscription
      );
      return subscriptionDto;
    });
  }

  async cancelSubscription({ id }: Id, em?: EntityManager): Promise<void> {
    const subscription = await (em ?? this.em).findOne(Subscription, { id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    subscription.active = false;
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
  }
  async resumeSubscription(idDto: Id, em?: EntityManager): Promise<void> {
    const subscription = await (em ?? this.em).findOne(Subscription, idDto);
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    subscription.active = true;
    await (em ?? this.em).transactional(async (innerEm) => {
      await innerEm.persist(subscription);
    });
  }
}
