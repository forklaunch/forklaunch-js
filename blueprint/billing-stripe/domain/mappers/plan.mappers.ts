import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { Plan } from '../../persistence/entities/plan.entity';
import { PlanSchemas } from '../schemas';

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
    toEntity: async (dto, em: EntityManager, providerFields: Stripe.Plan) => {
      // Find the existing plan first
      const existingPlan = await em.findOneOrFail(Plan, { id: dto.id });

      // Update the existing plan with new data
      Object.assign(existingPlan, {
        ...dto,
        providerFields,
        updatedAt: new Date()
      });

      return existingPlan;
    }
  }
);

export const PlanMapper = responseMapper(
  schemaValidator,
  PlanSchemas.PlanSchema,
  Plan,
  {
    toDto: async (entity: Plan) => {
      const baseData = await entity.read();
      return {
        ...baseData,
        stripeFields: entity.providerFields
      };
    }
  }
);
