import { schemaValidator } from '../../schema';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { SubscriptionStatus } from '@forklaunch/interfaces-ecommerce/types';
import { EntityManager } from '@mikro-orm/core';
import { Subscription } from '../../persistence/entities/subscription.entity';
import { SubscriptionSchemas } from '../schemas';

export const CreateSubscriptionMapper = requestMapper({
  schemaValidator,
  schema: SubscriptionSchemas.CreateSubscriptionSchema,
  entity: Subscription,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return em.create(Subscription, {
        customerId: dto.customerId,
        items: dto.items,
        intervalDays: dto.intervalDays,
        status: SubscriptionStatus.ACTIVE,
        nextOrderAt: dto.nextOrderAt,
        providerSubRef: dto.providerSubRef ?? null
      });
    }
  }
});

export const UpdateSubscriptionMapper = requestMapper({
  schemaValidator,
  schema: SubscriptionSchemas.UpdateSubscriptionSchema,
  entity: Subscription,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      const { id, ...rest } = dto;
      const entity = await em.findOneOrFail(Subscription, { id });
      em.assign(entity, rest);
      return entity;
    }
  }
});

export const SubscriptionMapper = responseMapper({
  schemaValidator,
  schema: SubscriptionSchemas.SubscriptionSchema,
  entity: Subscription,
  mapperDefinition: {
    toDto: async (entity) => ({
      ...entity,
      providerSubRef: entity.providerSubRef ?? undefined
    })
  }
});
