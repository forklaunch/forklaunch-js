import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Subscription } from '../../persistence/entities/subscription.entity';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { PartyEnum } from '../enum/party.enum';
import { SubscriptionSchemas } from '../schemas';

export const CreateSubscriptionMapper = requestMapper({
  schemaValidator,
  schema: SubscriptionSchemas.CreateSubscriptionSchema(
    PartyEnum,
    BillingProviderEnum
  ),
  entity: Subscription,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return Subscription.create(
        {
          ...dto,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        em
      );
    }
  }
});

export const UpdateSubscriptionMapper = requestMapper({
  schemaValidator,
  schema: SubscriptionSchemas.UpdateSubscriptionSchema(
    PartyEnum,
    BillingProviderEnum
  ),
  entity: Subscription,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return Subscription.update(dto, em);
    }
  }
});

export const SubscriptionMapper = responseMapper({
  schemaValidator,
  schema: SubscriptionSchemas.SubscriptionSchema(
    PartyEnum,
    BillingProviderEnum
  ),
  entity: Subscription,
  mapperDefinition: {
    toDto: async (entity: Subscription) => {
      return {
        ...(await entity.read()),
        endDate: entity.endDate || undefined
      };
    }
  }
});
