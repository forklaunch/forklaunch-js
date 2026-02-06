import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import Stripe from 'stripe';
import { Plan } from '../../persistence/entities/plan.entity';
import { PlanSchemas } from '../schemas';

export const CreatePlanMapper = requestMapper({
  schemaValidator,
  schema: PlanSchemas.CreatePlanSchema,
  entity: Plan,
  mapperDefinition: {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.Product
    ) => {
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
});

export const UpdatePlanMapper = requestMapper({
  schemaValidator,
  schema: PlanSchemas.UpdatePlanSchema,
  entity: Plan,
  mapperDefinition: {
    toEntity: async (
      dto,
      em: EntityManager,
      providerFields: Stripe.Product
    ) => {
      const existingPlan = await em.findOneOrFail(Plan, { id: dto.id });

      Object.assign(existingPlan, {
        ...dto,
        providerFields,
        updatedAt: new Date()
      });

      return existingPlan;
    }
  }
});

export const PlanMapper = responseMapper({
  schemaValidator,
  schema: PlanSchemas.PlanSchema,
  entity: Plan,
  mapperDefinition: {
    toDto: async (entity: Plan) => {
      const baseData = await entity.read();
      return {
        ...baseData,
        stripeFields: entity.providerFields
      };
    }
  }
});
