import { SchemaValidator } from '@forklaunch/framework-core';
import { EntityManager } from '@mikro-orm/core';
import { SubscriptionService } from '../interfaces/subscriptionService.interface';
import {
  CreateSubscriptionDto,
  CreateSubscriptionDtoMapper,
  SubscriptionDto,
  SubscriptionDtoMapper,
  UpdateSubscriptionDto,
  UpdateSubscriptionDtoMapper
} from '../models/dtoMapper/subscription.dtoMapper';
import { Party } from '../models/enum/party.enum';
import { Subscription } from '../models/persistence/subscription.entity';

export class BaseSubscriptionService implements SubscriptionService {
  constructor(private em: EntityManager) {}

  async createSubscription(
    subscriptionDto: CreateSubscriptionDto,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = CreateSubscriptionDtoMapper.deserializeDtoToEntity(
      SchemaValidator(),
      subscriptionDto
    );
    await (em ?? this.em).persistAndFlush(subscription);
    const createdSubscriptionDto = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      subscription
    );
    return createdSubscriptionDto;
  }

  async getSubscription(
    id: string,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Subscription, { id })
    );

    return subscription;
  }

  async getUserSubscription(
    id: string,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Subscription, {
        partyId: id,
        partyType: Party.USER,
        active: true
      })
    );

    return subscription;
  }

  async getOrganizationSubscription(
    id: string,
    em?: EntityManager
  ): Promise<SubscriptionDto> {
    const subscription = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      await (em ?? this.em).findOneOrFail(Subscription, {
        partyId: id,
        partyType: Party.ORGANIZATION,
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
    await (em ?? this.em).persistAndFlush(updatedSubscription);
    const updatedSubscriptionDto = SubscriptionDtoMapper.serializeEntityToDto(
      SchemaValidator(),
      updatedSubscription
    );

    return updatedSubscriptionDto;
  }

  async deleteSubscription(id: string, em?: EntityManager): Promise<void> {
    const subscription = await (em ?? this.em).findOne(Subscription, { id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    await (em ?? this.em).removeAndFlush(subscription);
  }

  async listSubscriptions(
    ids?: string[],
    em?: EntityManager
  ): Promise<SubscriptionDto[]> {
    const subscriptions = await (em ?? this.em).findAll(Subscription, {
      where: {
        id: {
          $in: ids
        }
      }
    });

    return subscriptions.map((subscription) => {
      const subscriptionDto = SubscriptionDtoMapper.serializeEntityToDto(
        SchemaValidator(),
        subscription
      );
      return subscriptionDto;
    });
  }

  async cancelSubscription(id: string, em?: EntityManager): Promise<void> {
    const subscription = await (em ?? this.em).findOne(Subscription, { id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    subscription.active = false;
    await (em ?? this.em).persistAndFlush(subscription);
  }
  async resumeSubscription(id: string, em?: EntityManager): Promise<void> {
    const subscription = await (em ?? this.em).findOne(Subscription, { id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
    subscription.active = true;
    await (em ?? this.em).persistAndFlush(subscription);
  }
}
