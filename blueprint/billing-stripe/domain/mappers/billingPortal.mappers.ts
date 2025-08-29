import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { BillingPortal } from '../../persistence/entities/billingPortal.entity';
import { BillingPortalSchemas } from '../../registrations';

export const CreateBillingPortalMapper = requestMapper(
  schemaValidator,
  BillingPortalSchemas.CreateBillingPortalSchema,
  BillingPortal,
  {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.BillingPortal.Session
    ) => {
      return BillingPortal.create(
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

export const UpdateBillingPortalMapper = requestMapper(
  schemaValidator,
  BillingPortalSchemas.UpdateBillingPortalSchema,
  BillingPortal,
  {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.BillingPortal.Session
    ) => {
      return BillingPortal.update(
        {
          ...dto,
          providerFields
        },
        em
      );
    }
  }
);

export const BillingPortalMapper = responseMapper(
  schemaValidator,
  BillingPortalSchemas.BillingPortalSchema,
  BillingPortal,
  {
    toDto: async (entity: BillingPortal) => {
      return {
        ...(await entity.read()),
        stripeFields: entity.providerFields
      };
    }
  }
);
