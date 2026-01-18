import { schemaValidator } from '@forklaunch/blueprint-core';
import { requestMapper, responseMapper } from '@forklaunch/core/mappers';
import { EntityManager } from '@mikro-orm/core';
import { Plan } from '../../persistence/entities/plan.entity';
import { BillingProviderEnum } from '../enum/billingProvider.enum';
import { CurrencyEnum } from '../enum/currency.enum';
import { PlanCadenceEnum } from '../enum/planCadence.enum';
import { PlanSchemas } from '../schemas';

export const CreatePlanMapper = requestMapper({
  schemaValidator,
  schema: PlanSchemas.CreatePlanSchema(
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  ),
  entity: Plan,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return Plan.create(
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

export const UpdatePlanMapper = requestMapper({
  schemaValidator,
  schema: PlanSchemas.UpdatePlanSchema(
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  ),
  entity: Plan,
  mapperDefinition: {
    toEntity: async (dto, em: EntityManager) => {
      return Plan.update(dto, em);
    }
  }
});

export const PlanMapper = responseMapper({
  schemaValidator,
  schema: PlanSchemas.PlanSchema(
    PlanCadenceEnum,
    CurrencyEnum,
    BillingProviderEnum
  ),
  entity: Plan,
  mapperDefinition: {
    toDto: async (entity: Plan) => {
      return await entity.read();
    }
  }
});
