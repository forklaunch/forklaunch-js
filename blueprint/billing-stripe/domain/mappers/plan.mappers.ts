import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { Plan } from '../../persistence/entities/plan.entity';
import { PlanSchemas } from '../../registrations';

export const CreatePlanMapper = requestMapper(
  schemaValidator,
  PlanSchemas.CreatePlanSchema,
  Plan,
  {
    toEntity: async (dto, em: EntityManager, providerFields: Stripe.Plan) => {
      return Plan.create(
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

export const UpdatePlanMapper = requestMapper(
  schemaValidator,
  PlanSchemas.UpdatePlanSchema,
  Plan,
  {
    toEntity: async (dto, em: EntityManager) => {
      return Plan.update(dto, em);
    }
  }
);

export const PlanMapper = responseMapper(
  schemaValidator,
  PlanSchemas.PlanSchema,
  Plan,
  {
    toDto: async (entity: Plan) => {
      return {
        ...(await entity.read()),
        stripeFields: entity.providerFields
      };
    }
  }
);
