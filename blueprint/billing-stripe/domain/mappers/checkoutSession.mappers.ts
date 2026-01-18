import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { StatusEnum } from '../enum/status.enum';
import { CheckoutSessionSchemas } from '../schemas';

export const CreateCheckoutSessionMapper = requestMapper({
  schemaValidator,
  schema: CheckoutSessionSchemas.CreateCheckoutSessionSchema(StatusEnum),
  entity: CheckoutSession,
  mapperDefinition: {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.Checkout.Session
    ) => {
      return CheckoutSession.create(
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
});

export const UpdateCheckoutSessionMapper = requestMapper({
  schemaValidator,
  schema: CheckoutSessionSchemas.UpdateCheckoutSessionSchema(StatusEnum),
  entity: CheckoutSession,
  mapperDefinition: {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.Checkout.Session
    ) => {
      return CheckoutSession.update(
        {
          ...dto,
          providerFields
        },
        em
      );
    }
  }
});

export const CheckoutSessionMapper = responseMapper({
  schemaValidator,
  schema: CheckoutSessionSchemas.CheckoutSessionSchema(StatusEnum),
  entity: CheckoutSession,
  mapperDefinition: {
    toDto: async (entity: CheckoutSession) => {
      return {
        ...(await entity.read()),
        stripeFields: entity.providerFields
      };
    }
  }
});
