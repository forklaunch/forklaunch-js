import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { CheckoutSession } from '../../persistence/entities/checkoutSession.entity';
import { CheckoutSessionSchemas } from '../../registrations';
import { StatusEnum } from '../enum/status.enum';

export const CreateCheckoutSessionMapper = requestMapper(
  schemaValidator,
  CheckoutSessionSchemas.CreateCheckoutSessionSchema(StatusEnum),
  CheckoutSession,
  {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.Checkout.Session
    ) => {
      return CheckoutSession.create(
        {
          ...dto,
          uri: `checkout/${Date.now()}`, // Generate a simple URI
          createdAt: new Date(),
          updatedAt: new Date(),
          providerFields
        },
        em
      );
    }
  }
);

export const UpdateCheckoutSessionMapper = requestMapper(
  schemaValidator,
  CheckoutSessionSchemas.UpdateCheckoutSessionSchema(StatusEnum),
  CheckoutSession,
  {
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
);

export const CheckoutSessionMapper = responseMapper(
  schemaValidator,
  CheckoutSessionSchemas.CheckoutSessionSchema(StatusEnum),
  CheckoutSession,
  {
    toDomain: async (entity: CheckoutSession) => {
      return {
        ...(await entity.read()),
        stripeFields: entity.providerFields
      };
    }
  }
);
