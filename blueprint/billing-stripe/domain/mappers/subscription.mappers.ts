import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { Subscription } from '../../persistence/entities/subscription.entity';
import { PartyEnum } from '../enum/party.enum';
import { SubscriptionSchemas } from '../schemas';

export const CreateSubscriptionMapper = requestMapper(
  schemaValidator,
  SubscriptionSchemas.CreateSubscriptionSchema(PartyEnum),
  Subscription,
  {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.Subscription
    ) => {
      return Subscription.create(
        {
          ...dto,
          createdAt: new Date(),
          updatedAt: new Date(),
          providerFields
        },
        em
      );
    }
  }
);

export const UpdateSubscriptionMapper = requestMapper(
  schemaValidator,
  SubscriptionSchemas.UpdateSubscriptionSchema(PartyEnum),
  Subscription,
  {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.Subscription
    ) => {
      return Subscription.update(
        {
          ...dto,
          providerFields
        },
        em
      );
    }
  }
);

export const SubscriptionMapper = responseMapper(
  schemaValidator,
  SubscriptionSchemas.SubscriptionSchema(PartyEnum),
  Subscription,
  {
    toDto: async (entity: Subscription) => {
      const data = await entity.read();
      return {
        ...data,
        // Convert null endDate to undefined for DTO validation
        endDate: data.endDate ?? undefined,
        stripeFields: entity.providerFields
      };
    }
  }
);
